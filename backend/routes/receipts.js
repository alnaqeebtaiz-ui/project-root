// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// --- استيراد جميع النماذج التي سنحتاجها ---
const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Subscriber = require('../models/Subscriber');

// --- تعريف المسارات (قائمة الطعام) ---

// المسار 1: جلب جميع السندات
router.get('/', async (req, res) => {
    try {
        const receipts = await Receipt.find()
            .populate('collector', 'name collectorCode')
            .populate('subscriber', 'name')
            .sort({ date: -1, receiptNumber: -1 });
            
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// المسار 2: استيراد كشف تحصيل دفعة واحدة مع منع التكرار
router.post('/batch', async (req, res) => {
    const rows = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صالحة.' });
    }

    try {
        // --- منطق البحث المجمع (كما كان) ---
        const collectorCodes = [...new Set(rows.map(r => r.collectorCode))];
        const subscriberNames = [...new Set(rows.map(r => r.subscriberName))];
        const existingCollectors = await Collector.find({ collectorCode: { $in: collectorCodes } });
        const existingSubscribers = await Subscriber.find({ name: { $in: subscriberNames } });
        const collectorMap = new Map(existingCollectors.map(c => [c.collectorCode, c._id]));
        let subscriberMap = new Map(existingSubscribers.map(s => [s.name, s._id]));
        
        // --- منطق إنشاء المشتركين الجدد (كما كان) ---
        const newSubscribersToCreate = subscriberNames.filter(name => !subscriberMap.has(name));
        if (newSubscribersToCreate.length > 0) {
            const createdSubscribers = await Subscriber.insertMany(
                newSubscribersToCreate.map(name => ({ name, address: 'غير محدد' }))
            );
            createdSubscribers.forEach(s => subscriberMap.set(s.name, s._id));
        }

        // ---  منطق التحقق من التكرار (الإضافة الجديدة والمهمة) ---
        const receiptNumbers = rows.map(r => r.receiptNumber);
        const potentialCollectorIds = [...collectorMap.values()];
        const existingReceipts = await Receipt.find({
            receiptNumber: { $in: receiptNumbers },
            collector: { $in: potentialCollectorIds }
        });
        const existingReceiptsSet = new Set(existingReceipts.map(r => `${r.receiptNumber}-${r.collector}`));
        
        const receiptsToCreate = [];
        const errors = [];
        let skippedCount = 0;

        for (const row of rows) {
            const collectorId = collectorMap.get(row.collectorCode);
            const subscriberId = subscriberMap.get(row.subscriberName);

            if (!collectorId) {
                errors.push(`لم يتم العثور على المحصل بالكود: ${row.collectorCode}`);
                continue;
            }
            if (!subscriberId) {
                errors.push(`خطأ في ربط المشترك: ${row.subscriberName}`);
                continue;
            }

            // إنشاء معرّف فريد للتحقق من التكرار
            const uniqueKey = `${row.receiptNumber}-${collectorId}`;
            if (existingReceiptsSet.has(uniqueKey)) {
                skippedCount++;
                continue; // تجاهل السند المكرر
            }

            receiptsToCreate.push({
                receiptNumber: row.receiptNumber,
                amount: row.amount,
                date: row.date,
                collector: collectorId,
                subscriber: subscriberId,
            });
        }
        
        let createdCount = 0;
        if (receiptsToCreate.length > 0) {
            const result = await Receipt.insertMany(receiptsToCreate);
            createdCount = result.length;
        }

        res.status(201).json({ 
            message: `اكتمل الاستيراد: ${createdCount} جديد, ${skippedCount} مكرر.`,
            newSubscribers: newSubscribersToCreate.length,
            errors: errors
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ فادح أثناء معالجة الملف.' });
    }
});

// المسار 3: إضافة سند يدوي جديد
router.post('/', async (req, res) => {
    const receipt = new Receipt({
        receiptNumber: req.body.receiptNumber,
        amount: req.body.amount,
        date: req.body.date,
        status: req.body.status,
        collector: req.body.collector,
        subscriber: req.body.subscriber,
    });
    try {
        const newReceipt = await receipt.save();
        res.status(201).json(newReceipt);
    } catch (err) {
        res.status(400).json({ message: 'فشل في إضافة السند.' });
    }
});

// المسار 4: تحديث بيانات سند
router.patch('/:id', async (req, res) => {
    try {
        const updatedReceipt = await Receipt.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedReceipt) {
            return res.status(404).json({ message: 'لم يتم العثور على السند' });
        }
        res.json(updatedReceipt);
    } catch (err) {
        res.status(400).json({ message: 'فشل في تحديث بيانات السند.' });
    }
});

// المسار 5: حذف سند
router.delete('/:id', async (req, res) => {
    try {
        const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
        if (!deletedReceipt) {
            return res.status(404).json({ message: 'لم يتم العثور على السند' });
        }
        res.json({ message: 'تم حذف السند بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة الحذف.' });
    }
});

module.exports = router;

