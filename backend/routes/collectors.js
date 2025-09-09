// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المحصل" الذي أنشأناه
const Collector = require('../models/Collector');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع المحصلين
router.get('/', async (req, res) => {
    try {
        const collectors = await Collector.find().sort({ collectorCode: 1 });
        res.json(collectors);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// --- الإضافة الجديدة والمهمة تبدأ هنا ---
// المسار 2: للبحث الذكي عن المحصلين (يجب أن يأتي قبل المسار العام /:id)
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
        }).limit(10); // إعادة أول 10 نتائج فقط لضمان السرعة

        res.json(collectors);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
});
// --- الإضافة الجديدة تنتهي هنا ---


// المسار 3: جلب محصل واحد بواسطة ID (يجب أن يأتي بعد المسارات الأكثر تحديدًا)
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
router.post('/', async (req, res) => {
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
router.patch('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

