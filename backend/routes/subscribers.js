// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المشترك" الذي أنشأناه
const Subscriber = require('../models/Subscriber');

// 💡 سطر جديد: استيراد الـ middleware للمصادقة والصلاحيات
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: للبحث الذكي عن المشتركين (يجب أن يأتي قبل المسار العام /:id)
// 💡 إضافة: حماية المسار بـ authenticateToken
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        if (searchTerm.length < 2) {
            return res.json([]); // لا تقم بالبحث إلا بعد إدخال حرفين على الأقل
        }

        // إنشاء تعبير نمطي للبحث (case-insensitive)
        const regex = new RegExp(searchTerm, 'i');

        // البحث في الاسم أو العنوان أو الهاتف، وإعادة أول 10 نتائج فقط
        const subscribers = await Subscriber.find({
            $or: [
                { name: regex },
                { address: regex },
                { phone: regex }
            ]
        }).limit(10);

        res.json(subscribers);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
});

// المسار 1: جلب المشتركين مع دعم الترقيم والبحث (GET /api/subscribers)
// 💡 إضافة: حماية المسار بـ authenticateToken
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
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

// المسار 2: جلب مشترك واحد بواسطة ID (GET /api/subscribers/:id)
// 💡 إضافة: حماية المسار بـ authenticateToken
router.get('/:id', authenticateToken, async (req, res) => {
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
// 💡 إضافة: حماية المسار بـ authenticateToken و authorizeRoles لدور 'admin' و 'manager'
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
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

// المسار 4: إضافة مجموعة مشتركين دفعة واحدة (POST /api/subscribers/batch)
// 💡 إضافة: حماية المسار بـ authenticateToken و authorizeRoles لدور 'admin' و 'manager'
router.post('/batch', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
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

// المسار 5: تحديث بيانات مشترك (PATCH /api/subscribers/:id)
// 💡 إضافة: حماية المسار بـ authenticateToken و authorizeRoles لدور 'admin' و 'manager'
router.patch('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
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
// 💡 إضافة: حماية المسار بـ authenticateToken و authorizeRoles لدور 'admin' فقط
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
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