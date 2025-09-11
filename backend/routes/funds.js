const express = require('express');
const router = express.Router();

// استيراد النماذج اللازمة
const Fund = require('../models/Fund');
const Collector = require('../models/Collector');

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 سطر جديد تمت إضافته هنا: لتطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡💡💡
// هذا يعني أن أي شخص يحاول الوصول لأي من مسارات الصناديق يجب أن يكون مسجل دخول (لديه توكن صالح).
router.use(authenticateToken); 

// --- تعريف المسارات ---

// المسار 1: جلب جميع الصناديق مع المحصلين المرتبطين بها
// 💡 ملاحظة: هذا المسار الآن محمي بشكل تلقائي بفضل `router.use(authenticateToken);` أعلاه.
router.get('/', async (req, res) => {
    try {
        // 1. ابحث عن كل الصناديق
        // 2. استخدم .populate('collectors') لتفعيل الحقل الافتراضي وجلب المحصلين المرتبطين
        const funds = await Fund.find().populate('collectors').sort({ name: 1 });
        res.json(funds);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: إضافة صندوق جديد مع ربط المحصلين
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager')` هنا 💡💡💡
// هذا يعني أن إضافة صندوق جديد تتطلب أن يكون المستخدم "مدير" أو "مشرف" (مسجل دخول ولديه هذا الدور).
router.post('/', authorizeRoles('admin', 'manager'), async (req, res) => {
    const { fundCode, name, description, collectors } = req.body;
    const newFund = new Fund({ fundCode, name, description });
    try {
        const savedFund = await newFund.save();
        if (collectors && collectors.length > 0) {
            await Collector.updateMany(
                { _id: { $in: collectors } },
                { $set: { fund: savedFund._id } }
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
// 💡💡💡 تمت إضافة `authorizeRoles('admin', 'manager')` هنا 💡💡💡
// هذا يعني أن تحديث صندوق يتطلب أن يكون المستخدم "مدير" أو "مشرف" (مسجل دخول ولديه هذا الدور).
router.patch('/:id', authorizeRoles('admin', 'manager'), async (req, res) => {
    const { fundCode, name, description, collectors } = req.body;
    try {
        const updatedFund = await Fund.findByIdAndUpdate(
            req.params.id,
            { fundCode, name, description },
            { new: true, runValidators: true }
        );
        if (!updatedFund) {
            return res.status(404).json({ message: 'لم يتم العثور على الصندوق.' });
        }
        // إدارة ارتباطات المحصلين
        await Collector.updateMany({ fund: req.params.id }, { $set: { fund: null } });
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
// 💡💡💡 تمت إضافة `authorizeRoles('admin')` هنا 💡💡💡
// هذا يعني أن حذف صندوق يتطلب أن يكون المستخدم "مدير" فقط (مسجل دخول ولديه هذا الدور).
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedFund = await Fund.findByIdAndDelete(req.params.id);
        if (!deletedFund) {
            return res.status(404).json({ message: 'لم يتم العثور على الصندوق.' });
        }
        await Collector.updateMany({ fund: req.params.id }, { $set: { fund: null } });
        res.json({ message: 'تم حذف الصندوق بنجاح.' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء الحذف.' });
    }
});

module.exports = router;