// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المحصل" الذي أنشأناه
const Collector = require('../models/Collector');

// 💡 سطر جديد: استيراد الـ middleware للمصادقة والصلاحيات
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡 سطر جديد: تطبيق authenticateToken على جميع المسارات في هذا الراوتر
// هذا يضمن أن جميع المسارات أدناه تتطلب تسجيل الدخول.
router.use(authenticateToken); 

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع المحصلين
// 💡 ملاحظة: هذا المسار الآن محمي بـ `authenticateToken` بسبب `router.use()` أعلاه.
router.get('/', async (req, res) => {
    try {
        const collectors = await Collector.find().sort({ collectorCode: 1 });
        res.json(collectors);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: للبحث الذكي عن المحصلين
// 💡 ملاحظة: هذا المسار الآن محمي بـ `authenticateToken` بسبب `router.use()` أعلاه.
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        if (!searchTerm) {
            return res.json([]);
        }

        const regex = new RegExp(searchTerm, 'i');

        const collectors = await Collector.find({
            $or: [
                { name: regex },
                { collectorCode: regex }
            ]
        }).limit(10); 

        res.json(collectors);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
});


// المسار 3: جلب محصل واحد بواسطة ID
// 💡 ملاحظة: هذا المسار الآن محمي بـ `authenticateToken` بسبب `router.use()` أعلاه.
router.get('/:id', async (req, res) => {
    try {
        const collector = await Collector.findById(req.params.id);
        if (!collector) {
            return res.status(404).json({ message: 'لم يتم العثور على المحصل' });
        }
        res.json(collector);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 4: إضافة محصل جديد
// 💡 إضافة: يتطلب دور 'admin' أو 'manager'
router.post('/', authorizeRoles('admin', 'manager'), async (req, res) => {
    const collector = new Collector({
        collectorCode: req.body.collectorCode,
        name: req.body.name,
        openingBalance: req.body.openingBalance
    });

    try {
        const newCollector = await collector.save();
        res.status(201).json(newCollector);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: `كود المحصل "${req.body.collectorCode}" مستخدم بالفعل.` });
        }
        res.status(400).json({ message: 'فشل في إضافة المحصل.' });
    }
});

// المسار 5: تحديث بيانات محصل
// 💡 إضافة: يتطلب دور 'admin' أو 'manager'
router.patch('/:id', authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const updatedCollector = await Collector.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedCollector) {
            return res.status(404).json({ message: 'لم يتم العثور على المحصل' });
        }
        
        res.json(updatedCollector);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: `كود المحصل "${req.body.collectorCode}" مستخدم بالفعل.` });
        }
        res.status(400).json({ message: 'فشل في تحديث بيانات المحصل.' });
    }
});

// المسار 6: حذف محصل
// 💡 إضافة: يتطلب دور 'admin' فقط
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedCollector = await Collector.findByIdAndDelete(req.params.id);

        if (!deletedCollector) {
            return res.status(404).json({ message: 'لم يتم العثور على المحصل' });
        }

        res.json({ message: 'تم حذف المحصل بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء محاولة الحذف.' });
    }
});

// تصدير الراوتر لكي يتمكن الخادم الرئيسي من استخدامه
module.exports = router;