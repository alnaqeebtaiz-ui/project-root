// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// --- استيراد جميع النماذج التي سنحتاجها ---
const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Subscriber = require('../models/Subscriber');
const mongoose = require('mongoose');

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 سطر جديد تمت إضافته هنا: لتطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡💡💡
// هذا يعني أن أي شخص يحاول الوصول لأي من مسارات السندات يجب أن يكون مسجل دخول (لديه توكن صالح).
router.use(authenticateToken);

// --- دالة تحويل Excel إلى JS Date (تبقى كما هي) ---
function excelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; // ثواني
    const date_info = new Date(utc_value * 1000);

    const fractional_day = serial - Math.floor(serial);
    let total_seconds = Math.floor(86400 * fractional_day);

    const seconds = total_seconds % 60;
    total_seconds -= seconds;

    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor(total_seconds / 60) % 60;

    date_info.setUTCHours(hours);
    date_info.setUTCMinutes(minutes);
    date_info.setUTCSeconds(seconds);
    date_info.setUTCMilliseconds(0);

    return date_info;
}

// --- المسار 1: جلب السندات (تم تعديله بالكامل لدعم الترقيم والفلاتر المتقدمة) ---
// 💡 ملاحظة: هذا المسار الآن محمي بشكل تلقائي بفضل `router.use(authenticateToken);` أعلاه.
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) === 0 ? 0 : (parseInt(req.query.limit) || 50);

        // --- بناء شروط البحث بناءً على الفلاتر الجديدة ---
        const queryConditions = {};
        
        // فلتر التاريخ (من - إلى) مع تصحيح تاريخ النهاية
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            // !! تعديل مهم: اجعل تاريخ النهاية يشمل اليوم بأكمله !!
            endDate.setUTCHours(23, 59, 59, 999); 
            
            queryConditions.date = {
                $gte: startDate,
                $lte: endDate
            };
        }
        
        // فلتر رقم السند (من - إلى)
        if (req.query.startReceipt && req.query.endReceipt) {
            queryConditions.receiptNumber = {
                $gte: parseInt(req.query.startReceipt),
                $lte: parseInt(req.query.endReceipt)
            };
        }
        
        // فلتر المحصل (إذا تم إرسال collectorId)
        if (req.query.collectorId) {
            if (mongoose.Types.ObjectId.isValid(req.query.collectorId)) {
                queryConditions.collector = req.query.collectorId;
            }
        }
        // --- نهاية بناء شروط البحث ---

        const totalReceipts = await Receipt.countDocuments(queryConditions);

        let query = Receipt.find(queryConditions)
            .populate('collector', 'name collectorCode')
            .populate('subscriber', 'name')
            .sort({ date: -1, receiptNumber: -1 });

        if (limit !== 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const receipts = await query;

        res.json({
            receipts,
            currentPage: page,
            totalPages: limit === 0 ? 1 : Math.ceil(totalReceipts / limit),
            totalReceipts
        });

    } catch (err) {
        console.error("Error fetching receipts:", err);
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// --- المسار 2: استيراد كشف تحصيل دفعة واحدة ---
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager')` هنا 💡💡💡
// هذا يعني أن استيراد الدفعات يتطلب أن يكون المستخدم "مدير" أو "مشرف".
router.post('/batch', authorizeRoles('admin', 'manager'), async (req, res) => {
    const rows = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صالحة.' });
    }

    try {
        const collectorCodes = [...new Set(rows.map(r => r.collectorCode))];
        const subscriberNames = [...new Set(rows.map(r => r.subscriberName))];
        const existingCollectors = await Collector.find({ collectorCode: { $in: collectorCodes } });
        const existingSubscribers = await Subscriber.find({ name: { $in: subscriberNames } });
        const collectorMap = new Map(existingCollectors.map(c => [c.collectorCode, c._id]));
        let subscriberMap = new Map(existingSubscribers.map(s => [s.name, s._id]));

        const newSubscribersToCreate = subscriberNames.filter(name => !subscriberMap.has(name));
        if (newSubscribersToCreate.length > 0) {
            const createdSubscribers = await Subscriber.insertMany(
                newSubscribersToCreate.map(name => ({ name, address: 'غير محدد' }))
            );
            createdSubscribers.forEach(s => subscriberMap.set(s.name, s._id));
        }

        const receiptNumbers = rows.map(r => r.receiptNumber);
        const potentialCollectorIds = [...collectorMap.values()];
        const existingReceipts = await Receipt.find({
            receiptNumber: { $in: receiptNumbers },
            collector: { $in: potentialCollectorIds }
        });
        const existingReceiptsSet = new Set(existingReceipts.map(r => `${r.receiptNumber}-${r.collector}`));

        const receiptsToCreate = [];
        const errors = [];
        let skippedCount = 0;

        for (const row of rows) {
            const collectorId = collectorMap.get(row.collectorCode);
            const subscriberId = subscriberMap.get(row.subscriberName);

            if (!collectorId) {
                errors.push(`لم يتم العثور على المحصل بالكود: ${row.collectorCode}`);
                continue;
            }
            if (!subscriberId) {
                errors.push(`خطأ في ربط المشترك: ${row.subscriberName}`);
                continue;
            }

            const uniqueKey = `${row.receiptNumber}-${collectorId}`;
            if (existingReceiptsSet.has(uniqueKey)) {
                skippedCount++;
                continue;
            }

            let receiptDate = (typeof row.date === 'number') 
                ? excelDateToJSDate(row.date) 
                : new Date(row.date);

            receiptDate.setDate(receiptDate.getDate() + 1);
            receiptDate.setHours(0, 0, 0, 0);

            receiptsToCreate.push({
                receiptNumber: row.receiptNumber,
                amount: row.amount,
                date: receiptDate,
                collector: collectorId,
                subscriber: subscriberId,
            });
        }

        let createdCount = 0;
        if (receiptsToCreate.length > 0) {
            const result = await Receipt.insertMany(receiptsToCreate);
            createdCount = result.length;
        }

        res.status(201).json({
            message: `اكتمل الاستيراد: ${createdCount} جديد, ${skippedCount} مكرر.`,
            newSubscribers: newSubscribersToCreate.length,
            errors: errors
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ فادح أثناء معالجة الملف.' });
    }
});

// --- المسار 3: إضافة سند يدوي ---
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager', 'collector')` هنا 💡💡💡
// هذا يعني أن إضافة سند يدوي يتطلب أن يكون المستخدم "مدير" أو "مشرف" أو "محصل" (مسجل دخول ولديه هذا الدور).
router.post('/', authorizeRoles('admin', 'manager', 'collector'), async (req, res) => {

    // معالجة التاريخ لضمان حفظه بشكل صحيح كبداية اليوم بتوقيت UTC
    let receiptDate = new Date(req.body.date);
    receiptDate.setUTCHours(0, 0, 0, 0); // ضبط التوقيت لمنتصف الليل (UTC) لليوم المحدد
    const receipt = new Receipt({
        receiptNumber: req.body.receiptNumber,
        amount: req.body.amount,
        date: receiptDate,
        status: req.body.status,
        collector: req.body.collector,
        subscriber: req.body.subscriber,
    });
    try {
        const newReceipt = await receipt.save();
        res.status(201).json(newReceipt);
    } catch (err) {
        res.status(400).json({ message: 'فشل في إضافة السند.' });
    }
});

// --- المسار 4: تحديث سند ---
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager')` هنا 💡💡💡
// هذا يعني أن تحديث سند يتطلب أن يكون المستخدم "مدير" أو "مشرف".
router.patch('/:id', authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const updatedReceipt = await Receipt.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedReceipt) return res.status(404).json({ message: 'لم يتم العثور على السند' });
        res.json(updatedReceipt);
    } catch (err) {
        res.status(400).json({ message: 'فشل في تحديث بيانات السند.' });
    }
});

// --- المسار 5: حذف سند ---
// 💡💡💡 تمت إضافة `authorizeRoles('admin')` هنا 💡💡💡
// هذا يعني أن حذف سند يتطلب أن يكون المستخدم "مدير" فقط.
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
        if (!deletedReceipt) return res.status(404).json({ message: 'لم يتم العثور على السند' });
        res.json({ message: 'تم حذف السند بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة الحذف.' });
    }
});

// --- المسار 6: البحث الذكي عن المحصلين (Autocomplete) ---
router.get('/search-collectors', authenticateToken, async (req, res) => {
    const { query } = req.query; // النص الذي يكتبه المستخدم للبحث
    if (!query) {
        return res.status(200).json([]); // لا يوجد نص للبحث، أعد قائمة فارغة
    }

    try {
        // البحث عن المحصلين الذين يحتوي اسمهم أو كودهم على النص المدخل
        // نستخدم i$ لجعل البحث غير حساس لحالة الأحرف (case-insensitive)
        const collectors = await Collector.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { collectorCode: { $regex: query, $options: 'i' } }
            ]
        }).select('_id name collectorCode').limit(10); // تحديد الحقول المطلوبة وتحديد عدد النتائج

        res.json(collectors);
    } catch (err) {
        console.error("Error searching collectors:", err);
        res.status(500).json({ message: 'حدث خطأ أثناء البحث عن المحصلين.' });
    }
});

// --- المسار 7: البحث الذكي عن المشتركين (Autocomplete) ---
router.get('/search-subscribers', authenticateToken, async (req, res) => {
    const { query } = req.query; // النص الذي يكتبه المستخدم للبحث
    if (!query) {
        return res.status(200).json([]); // لا يوجد نص للبحث، أعد قائمة فارغة
    }

    try {
        // البحث عن المشتركين الذين يحتوي اسمهم على النص المدخل
        const subscribers = await Subscriber.find({
            name: { $regex: query, $options: 'i' }
        }).select('_id name').limit(10); // تحديد الحقول المطلوبة وتحديد عدد النتائج

        res.json(subscribers);
    } catch (err) {
        console.error("Error searching subscribers:", err);
        res.status(500).json({ message: 'حدث خطأ أثناء البحث عن المشتركين.' });
    }
});

module.exports = router;