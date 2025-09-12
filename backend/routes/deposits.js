// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // <-- استيراد Mongoose

// استيراد "نموذج التوريد" الذي أنشأناه
const Deposit = require('../models/Deposit');

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 سطر جديد تمت إضافته هنا: لتطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡💡💡
// هذا يعني أن أي شخص يحاول الوصول لأي من مسارات التوريدات يجب أن يكون مسجل دخول (لديه توكن صالح).
router.use(authenticateToken); 

// --- تعريف المسارات (قائمة الطعام) ---

// --- تم تعديل هذا المسار بالكامل لدعم الترقيم والفلاتر ---
// المسار 1: جلب سجلات التوريد مع دعم الترقيم والفلترة (GET /api/deposits)
// 💡 ملاحظة: هذا المسار الآن محمي بشكل تلقائي بفضل `router.use(authenticateToken);` أعلاه.
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) === 0 ? 0 : (parseInt(req.query.limit) || 50);

        const queryConditions = {};

        // فلتر نطاق التاريخ
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            endDate.setUTCHours(23, 59, 59, 999); // لضمان شمول اليوم الأخير كاملاً
            queryConditions.depositDate = { $gte: startDate, $lte: endDate };
        }

        // فلتر المحصل
        if (req.query.collectorId && mongoose.Types.ObjectId.isValid(req.query.collectorId)) {
            queryConditions.collector = req.query.collectorId;
        }

        const totalDeposits = await Deposit.countDocuments(queryConditions);

        let query = Deposit.find(queryConditions)
            .populate('collector', 'name collectorCode')
            .sort({ depositDate: -1 });

        // تطبيق الترقيم فقط إذا لم يكن طلب تصدير (limit !== 0)
        if (limit !== 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const deposits = await query;

        res.json({
            deposits,
            currentPage: page,
            totalPages: limit === 0 ? 1 : Math.ceil(totalDeposits / limit),
            totalDeposits
        });

    } catch (err) {
        console.error(err); // طباعة الخطأ الكامل في الكونسول لمزيد من التفاصيل
        res.status(500).json({ message: 'حدث خطأ في الخادم عند جلب التوريدات.' });
    }
});

// **********************************************
// 💡💡💡 المسار الجديد الذي يجب إضافته: جلب سند توريد واحد بواسطة الـ ID 💡💡💡
// **********************************************
router.get('/:id', async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id)
                                    .populate('collector', 'name collectorCode'); // جلب بيانات المحصل أيضًا
        if (!deposit) {
            return res.status(404).json({ message: 'لم يتم العثور على سجل التوريد.' });
        }
        res.json(deposit);
    } catch (err) {
        console.error(err); // طباعة الخطأ الكامل في الكونسول لمزيد من التفاصيل
        // إذا كان الـ ID غير صالح (ليس ObjectId صحيح)، سيتم التعامل معه هنا.
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'صيغة معرف سجل التوريد غير صالحة.' });
        }
        res.status(500).json({ message: 'حدث خطأ في الخادم عند جلب سجل التوريد.' });
    }
});
// **********************************************
// نهاية المسار الجديد
// **********************************************


// المسار 2: إضافة سجل توريد جديد (POST /api/deposits)
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager', 'collector')` هنا 💡💡💡
// هذا يعني أن إضافة سجل توريد جديد تتطلب أن يكون المستخدم "مدير" أو "مشرف" أو "محصل" (مسجل دخول ولديه هذا الدور).
router.post('/', authorizeRoles('admin', 'manager', 'collector'), async (req, res) => {
    const deposit = new Deposit({
        amount: req.body.amount,
        depositDate: req.body.depositDate,
        referenceNumber: req.body.referenceNumber,
        collector: req.body.collector,
    });

    try {
        const newDeposit = await deposit.save();
        res.status(201).json(newDeposit);
    } catch (err) {
        console.error(err); // طباعة الخطأ الكامل في الكونسول
        res.status(400).json({ message: 'فشل في إضافة سجل التوريد. تأكد من إدخال كل الحقول المطلوبة.' });
    }
});

// المسار 3: تحديث بيانات سجل توريد (PATCH /api/deposits/:id)
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager')` هنا 💡💡💡
// هذا يعني أن تحديث سجل توريد يتطلب أن يكون المستخدم "مدير" أو "مشرف" (مسجل دخول ولديه هذا الدور).
router.patch('/:id', authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        // التحقق من صحة الـ ID قبل البحث
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف سجل التوريد غير صالح.' });
        }

        const updatedDeposit = await Deposit.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedDeposit) {
            return res.status(404).json({ message: 'لم يتم العثور على سجل التوريد للتحديث.' });
        }
        
        res.json(updatedDeposit);
    } catch (err) {
        console.error(err); // طباعة الخطأ الكامل في الكونسول
        res.status(400).json({ message: 'فشل في تحديث بيانات السجل.' });
    }
});

// المسار 4: حذف سجل توريد (DELETE /api/deposits/:id)
// 💡💡💡 تمت إضافة `authorizeRoles('admin')` هنا 💡💡💡
// هذا يعني أن حذف سجل توريد يتطلب أن يكون المستخدم "مدير" فقط (مسجل دخول ولديه هذا الدور).
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        // التحقق من صحة الـ ID قبل الحذف
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف سجل التوريد غير صالح.' });
        }

        const deletedDeposit = await Deposit.findByIdAndDelete(req.params.id);

        if (!deletedDeposit) {
            return res.status(404).json({ message: 'لم يتم العثور على سجل التوريد للحذف.' });
        }

        res.json({ message: 'تم حذف سجل التوريد بنجاح' });
    } catch (err) {
        console.error(err); // طباعة الخطأ الكامل في الكونسول
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء محاولة الحذف.' });
    }
});

// تصدير الراوتر لكي يتمكن الخادم الرئيسي من استخدامه
module.exports = router;