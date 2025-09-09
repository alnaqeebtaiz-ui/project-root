// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// --- استيراد جميع النماذج التي سنحتاجها ---
const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Subscriber = require('../models/Subscriber');
const mongoose = require('mongoose');

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

// --- المسار 2: استيراد كشف تحصيل دفعة واحدة (يبقى كما هو بدون تغيير) ---
router.post('/batch', async (req, res) => {
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

// --- المسار 3: إضافة سند يدوي (يبقى كما هو بدون تغيير) ---
router.post('/', async (req, res) => {
    const receipt = new Receipt({
        receiptNumber: req.body.receiptNumber,
        amount: req.body.amount,
        date: req.body.date,
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

// --- المسار 4: تحديث سند (يبقى كما هو بدون تغيير) ---
router.patch('/:id', async (req, res) => {
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

// --- المسار 5: حذف سند (يبقى كما هو بدون تغيير) ---
router.delete('/:id', async (req, res) => {
    try {
        const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
        if (!deletedReceipt) return res.status(404).json({ message: 'لم يتم العثور على السند' });
        res.json({ message: 'تم حذف السند بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة الحذف.' });
    }
});

module.exports = router;