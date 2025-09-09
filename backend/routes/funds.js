const express = require('express');
const router = express.Router();

// استيراد النماذج اللازمة
const Fund = require('../models/Fund');
const Collector = require('../models/Collector');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع الصناديق مع حساب أرصدتها تلقائيًا
router.get('/', async (req, res) => {
    try {
        // استخدام MongoDB Aggregation Pipeline لحساب الأرصدة بكفاءة عالية
        const fundsWithBalance = await Collector.aggregate([
            {
                $match: { fund: { $ne: null } } // فقط المحصلون المرتبطون بصناديق
            },
            {
                $group: {
                    _id: '$fund', // تجميع حسب معرّف الصندوق
                    totalBalance: { $sum: '$openingBalance' }, // جمع أرصدتهم
                    collectorCount: { $sum: 1 } // حساب عددهم
                }
            },
            {
                $lookup: { // ربط النتائج ببيانات الصناديق
                    from: 'funds', // من مجموعة الصناديق
                    localField: '_id', // الحقل المحلي (معرّف الصندوق)
                    foreignField: '_id', // الحقل الأجنبي (معرّف الصندوق)
                    as: 'fundDetails' // اسم الحقل الجديد للبيانات المجلوبة
                }
            },
            {
                $unwind: '$fundDetails' // فك ضغط مصفوفة fundDetails
            },
            {
                $project: { // تحديد شكل البيانات النهائية
                    _id: '$fundDetails._id',
                    name: '$fundDetails.name',
                    fundCode: '$fundDetails.fundCode',
                    description: '$fundDetails.description',
                    totalBalance: '$totalBalance',
                    collectorCount: '$collectorCount'
                }
            }
        ]);
        res.json(fundsWithBalance);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: إضافة صندوق جديد مع ربط المحصلين
router.post('/', async (req, res) => {
    const { fundCode, name, description, collectors } = req.body;

    const newFund = new Fund({ fundCode, name, description });

    try {
        const savedFund = await newFund.save();

        // إذا تم إرسال قائمة بالـ IDs للمحصلين، قم بتحديثهم
        if (collectors && collectors.length > 0) {
            await Collector.updateMany(
                { _id: { $in: collectors } }, // ابحث عن كل المحصلين في هذه القائمة
                { $set: { fund: savedFund._id } } // وقم بتعيينهم لهذا الصندوق الجديد
            );
        }

        res.status(201).json(savedFund);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: `كود الصندوق "${fundCode}" مستخدم بالفعل.` });
        }
        res.status(400).json({ message: 'فشل في إضافة الصندوق.' });
    }
});

// المسار 3: تحديث بيانات صندوق وارتباطاته
router.patch('/:id', async (req, res) => {
    const { fundCode, name, description, collectors } = req.body;

    try {
        // تحديث بيانات الصندوق الأساسية
        const updatedFund = await Fund.findByIdAndUpdate(
            req.params.id,
            { fundCode, name, description },
            { new: true, runValidators: true }
        );

        if (!updatedFund) {
            return res.status(404).json({ message: 'لم يتم العثور على الصندوق.' });
        }

        // --- إدارة ارتباطات المحصلين ---
        // 1. إزالة الارتباط القديم من كل المحصلين الذين كانوا يتبعون هذا الصندوق
        await Collector.updateMany({ fund: req.params.id }, { $set: { fund: null } });

        // 2. إضافة الارتباط الجديد للمحصلين المحددين في الطلب
        if (collectors && collectors.length > 0) {
            await Collector.updateMany(
                { _id: { $in: collectors } },
                { $set: { fund: req.params.id } }
            );
        }

        res.json(updatedFund);
    } catch (err) {
         if (err.code === 11000) {
            return res.status(400).json({ message: `كود الصندوق "${fundCode}" مستخدم بالفعل.` });
        }
        res.status(400).json({ message: 'فشل في تحديث الصندوق.' });
    }
});

// المسار 4: حذف صندوق
router.delete('/:id', async (req, res) => {
    try {
        const deletedFund = await Fund.findByIdAndDelete(req.params.id);
        if (!deletedFund) {
            return res.status(404).json({ message: 'لم يتم العثور على الصندوق.' });
        }
        // إزالة ارتباط المحصلين بهذا الصندوق المحذوف
        await Collector.updateMany({ fund: req.params.id }, { $set: { fund: null } });
        res.json({ message: 'تم حذف الصندوق بنجاح.' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء الحذف.' });
    }
});

module.exports = router;
