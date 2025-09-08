// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المشترك" الذي أنشأناه
const Subscriber = require('../models/Subscriber');

// --- تعريف المسارات (قائمة الطعام) ---

// --- تم تعديل هذا المسار لدعم حالة التصدير الكامل ---
// المسار 1: جلب المشتركين مع دعم الترقيم والبحث (GET /api/subscribers)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        // تعديل: إذا كان limit=0، اعتبره طلبًا للتصدير
        const limit = parseInt(req.query.limit) === 0 ? 0 : (parseInt(req.query.limit) || 50);
        const search = req.query.search || '';

        const queryConditions = {};
        if (search) {
            queryConditions.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const totalSubscribers = await Subscriber.countDocuments(queryConditions);
        
        // بناء الاستعلام الأساسي
        let query = Subscriber.find(queryConditions).sort({ name: 1 });

        // تطبيق الترقيم فقط إذا لم يكن طلب تصدير
        if (limit !== 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const subscribers = await query;

        res.json({
            subscribers,
            currentPage: page,
            totalPages: limit === 0 ? 1 : Math.ceil(totalSubscribers / limit),
            totalSubscribers
        });

    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});
// --- نهاية التعديل ----


// المسار 2: جلب مشترك واحد بواسطة ID (GET /api/subscribers/:id)
// ... (يبقى كما هو بدون تغيير)
router.get('/:id', async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ message: 'لم يتم العثور على المشترك' });
        }
        res.json(subscriber);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});


// المسار 3: إضافة مشترك جديد (POST /api/subscribers)
// ... (يبقى كما هو بدون تغيير)
router.post('/', async (req, res) => {
    const subscriber = new Subscriber({
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone
    });

    try {
        const newSubscriber = await subscriber.save();
        res.status(201).json(newSubscriber);
    } catch (err) {
        res.status(400).json({ message: 'فشل في إضافة المشترك. تأكد من إدخال كل الحقول المطلوبة.' });
    }
});

// --- تم تعديل هذا المسار لمنع تكرار البيانات ---
// المسار 4: إضافة مجموعة مشتركين دفعة واحدة (POST /api/subscribers/batch)
router.post('/batch', async (req, res) => {
    const subscribersToImport = req.body;

    if (!Array.isArray(subscribersToImport) || subscribersToImport.length === 0) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صالحة.' });
    }

    try {
        // 1. استخراج أسماء المشتركين من البيانات القادمة
        const subscriberNames = subscribersToImport.map(s => s.name);

        // 2. البحث في قاعدة البيانات عن الأسماء الموجودة مسبقًا
        const existingSubscribers = await Subscriber.find({ name: { $in: subscriberNames } });
        const existingNames = new Set(existingSubscribers.map(s => s.name));

        // 3. فلترة القائمة لإبقاء المشتركين الجدد فقط
        const newSubscribers = subscribersToImport.filter(s => !existingNames.has(s.name));
        
        const skippedCount = subscribersToImport.length - newSubscribers.length;
        let createdCount = 0;

        // 4. إضافة المشتركين الجدد فقط إلى قاعدة البيانات
        if (newSubscribers.length > 0) {
            const result = await Subscriber.insertMany(newSubscribers, { ordered: false });
            createdCount = result.length;
        }
        
        res.status(201).json({ 
            message: `اكتمل الاستيراد: ${createdCount} مشترك جديد, ${skippedCount} مكرر.` 
        });

    } catch (err) {
        console.error("Batch import error:", err);
        res.status(500).json({ message: 'حدث خطأ أثناء استيراد البيانات.' });
    }
});
// --- نهاية التعديل ---


// المسار 5: تحديث بيانات مشترك (PATCH /api/subscribers/:id)
// ... (يبقى كما هو بدون تغيير)
router.patch('/:id', async (req, res) => {
    try {
        const updatedSubscriber = await Subscriber.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedSubscriber) {
            return res.status(404).json({ message: 'لم يتم العثور على المشترك' });
        }
        res.json(updatedSubscriber);
    } catch (err) {
        res.status(400).json({ message: 'فشل في تحديث بيانات المشترك.' });
    }
});

// المسار 6: حذف مشترك (DELETE /api/subscribers/:id)
// ... (يبقى كما هو بدون تغيير)
router.delete('/:id', async (req, res) => {
    try {
        const deletedSubscriber = await Subscriber.findByIdAndDelete(req.params.id);
        if (!deletedSubscriber) {
            return res.status(404).json({ message: 'لم يتم العثور على المشترك' });
        }
        res.json({ message: 'تم حذف المشترك بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء محاولة الحذف.' });
    }
});


// تصدير الراوتر لكي يتمكن الخادم الرئيسي من استخدامه
module.exports = router;