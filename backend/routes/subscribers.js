// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// استيراد "نموذج المشترك" الذي أنشأناه
const Subscriber = require('../models/Subscriber');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع المشتركين (GET /api/subscribers)
router.get('/', async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort({ name: 1 }); // جلبهم مرتبين بالاسم
        res.json(subscribers);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: جلب مشترك واحد بواسطة ID (GET /api/subscribers/:id)
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

// --- الإضافة الجديدة تبدأ هنا ---
// المسار 4: إضافة مجموعة مشتركين دفعة واحدة (POST /api/subscribers/batch)
router.post('/batch', async (req, res) => {
    const subscribers = req.body;

    // التحقق من أن البيانات المرسلة هي مصفوفة وغير فارغة
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صالحة. يجب أن تكون مصفوفة من المشتركين.' });
    }

    try {
        // استخدام insertMany لإضافة جميع المشتركين في عملية واحدة
        const result = await Subscriber.insertMany(subscribers, { ordered: false });
        res.status(201).json({ message: `تم استيراد ${result.length} مشترك بنجاح` });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء استيراد البيانات.' });
    }
});
// --- الإضافة الجديدة تنتهي هنا ---


// المسار 5: تحديث بيانات مشترك (PATCH /api/subscribers/:id)
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

