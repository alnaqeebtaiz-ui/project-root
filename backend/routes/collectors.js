// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المحصل" الذي أنشأناه
const Collector = require('../models/Collector');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع المحصلين (GET /api/collectors)
router.get('/', async (req, res) => {
    try {
        const collectors = await Collector.find().sort({ collectorCode: 1 }); // جلبهم مرتبين بالكود
        res.json(collectors);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: جلب محصل واحد بواسطة ID (GET /api/collectors/:id)
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

// المسار 3: إضافة محصل جديد (POST /api/collectors)
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
        // التحقق من خطأ تكرار الكود
        if (err.code === 11000) {
            return res.status(400).json({ message: `كود المحصل "${req.body.collectorCode}" مستخدم بالفعل.` });
        }
        res.status(400).json({ message: 'فشل في إضافة المحصل. تأكد من إدخال كل الحقول المطلوبة.' });
    }
});

// المسار 4: تحديث بيانات محصل (PATCH /api/collectors/:id)
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

// المسار 5: حذف محصل (DELETE /api/collectors/:id)
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
