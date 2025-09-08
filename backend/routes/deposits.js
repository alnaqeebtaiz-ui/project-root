// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج التوريد" الذي أنشأناه
const Deposit = require('../models/Deposit');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع سجلات التوريد (GET /api/deposits)
router.get('/', async (req, res) => {
    try {
        // .populate() لجلب بيانات المحصل المرتبطة بدلاً من مجرد الـ ID
        const deposits = await Deposit.find()
            .populate('collector', 'name collectorCode') // من مجموعة المحصلين، أحضر الاسم والكود
            .sort({ depositDate: -1 }); // جلبهم مرتبين بالتاريخ (الأحدث أولاً)
            
        res.json(deposits);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: إضافة سجل توريد جديد (POST /api/deposits)
router.post('/', async (req, res) => {
    const deposit = new Deposit({
        amount: req.body.amount,
        depositDate: req.body.depositDate,
        referenceNumber: req.body.referenceNumber,
        collector: req.body.collector, // يجب أن يكون ID المحصل
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
