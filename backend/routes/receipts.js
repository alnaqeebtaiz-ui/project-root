// استيراد Express لإنشاء "راوتر" خاص بالمسارات
const express = require('express');
const router = express.Router();

// --- استيراد جميع النماذج التي سنحتاجها ---
const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Subscriber = require('../models/Subscriber');

// --- دالة تحويل Excel إلى JS Date ---
function excelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; // ثواني
    const date_info = new Date(utc_value * 1000);

    const fractional_day = serial - Math.floor(serial);
    let total_seconds = Math.floor(86400 * fractional_day);

    const seconds = total_seconds % 60;
    total_seconds -= seconds;

    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor(total_seconds / 60) % 60;

    date_info.setUTCHours(hours);
    date_info.setUTCMinutes(minutes);
    date_info.setUTCSeconds(seconds);
    date_info.setUTCMilliseconds(0);

    return date_info;
}

// --- المسار 1: جلب جميع السندات ---
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

// --- المسار 2: استيراد كشف تحصيل دفعة واحدة مع منع التكرار ---
router.post('/batch', async (req, res) => {
    const rows = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صالحة.' });
    }

    try {
        const collectorCodes = [...new Set(rows.map(r => r.collectorCode))];
        const subscriberNames = [...new Set(rows.map(r => r.subscriberName))];
        const existingCollectors = await Collector.find({ collectorCode: { $in: collectorCodes } });
        const existingSubscribers = await Subscriber.find({ name: { $in: subscriberNames } });
        const collectorMap = new Map(existingCollectors.map(c => [c.collectorCode, c._id]));
        let subscriberMap = new Map(existingSubscribers.map(s => [s.name, s._id]));

        // إنشاء المشتركين الجدد
        const newSubscribersToCreate = subscriberNames.filter(name => !subscriberMap.has(name));
        if (newSubscribersToCreate.length > 0) {
            const createdSubscribers = await Subscriber.insertMany(
                newSubscribersToCreate.map(name => ({ name, address: 'غير محدد' }))
            );
            createdSubscribers.forEach(s => subscriberMap.set(s.name, s._id));
        }

        // التحقق من التكرار
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

            const uniqueKey = `${row.receiptNumber}-${collectorId}`;
            if (existingReceiptsSet.has(uniqueKey)) {
                skippedCount++;
                continue;
            }

            // تحويل التاريخ من Excel أو نص
            let receiptDate = (typeof row.date === 'number') 
                ? excelDateToJSDate(row.date) 
                : new Date(row.date);

            // إضافة يوم واحد لتصحيح الفارق
            receiptDate.setDate(receiptDate.getDate() + 1);
            // ضبط منتصف الليل
            receiptDate.setHours(0, 0, 0, 0);

            receiptsToCreate.push({
                receiptNumber: row.receiptNumber,
                amount: row.amount,
                date: receiptDate,
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

// --- المسار 3: إضافة سند يدوي ---
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

// --- المسار 4: تحديث سند ---
router.patch('/:id', async (req, res) => {
    try {
        const updatedReceipt = await Receipt.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedReceipt) return res.status(404).json({ message: 'لم يتم العثور على السند' });
        res.json(updatedReceipt);
    } catch (err) {
        res.status(400).json({ message: 'فشل في تحديث بيانات السند.' });
    }
});

// --- المسار 5: حذف سند ---
router.delete('/:id', async (req, res) => {
    try {
        const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
        if (!deletedReceipt) return res.status(404).json({ message: 'لم يتم العثور على السند' });
        res.json({ message: 'تم حذف السند بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة الحذف.' });
    }
});

module.exports = router;
