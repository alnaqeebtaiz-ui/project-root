// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // <-- استيراد Mongoose

// استيراد "نموذج التوريد" الذي أنشأناه
const Deposit = require('../models/Deposit');

// --- تعريف المسارات (قائمة الطعام) ---

// --- تم تعديل هذا المسार بالكامل لدعم الترقيم والفلاتر ---
// المسار 1: جلب سجلات التوريد مع دعم الترقيم والفلترة (GET /api/deposits)
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
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});
// --- نهاية التعديل ---

// المسار 2: إضافة سجل توريد جديد (POST /api/deposits)
router.post('/', async (req, res) => {
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
        res.status(400).json({ message: 'فشل في إضافة سجل التوريد. تأكد من إدخال كل الحقول المطلوبة.' });
    }
});

// المسار 3: تحديث بيانات سجل توريد (PATCH /api/deposits/:id)
router.patch('/:id', async (req, res) => {
    try {
        const updatedDeposit = await Deposit.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedDeposit) {
            return res.status(404).json({ message: 'لم يتم العثور على سجل التوريد' });
        }
        
        res.json(updatedDeposit);
    } catch (err) {
        res.status(400).json({ message: 'فشل في تحديث بيانات السجل.' });
    }
});

// المسار 4: حذف سجل توريد (DELETE /api/deposits/:id)
router.delete('/:id', async (req, res) => {
    try {
        const deletedDeposit = await Deposit.findByIdAndDelete(req.params.id);

        if (!deletedDeposit) {
            return res.status(404).json({ message: 'لم يتم العثور على سجل التوريد' });
        }

        res.json({ message: 'تم حذف سجل التوريد بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء محاولة الحذف.' });
    }
});

// تصدير الراوتر لكي يتمكن الخادم الرئيسي من استخدامه
module.exports = router;