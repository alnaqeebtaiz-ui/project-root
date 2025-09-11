const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Subscriber = require('../models/Subscriber');
const mongoose = require('mongoose');

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 سطر جديد تمت إضافته هنا: لتطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡💡💡
// هذا يعني أن أي شخص يحاول الوصول لأي من مسارات تقارير المشتركين يجب أن يكون مسجل دخول (لديه توكن صالح).
// بالإضافة إلى ذلك، يجب أن يكون لديه دور "admin" أو "manager".
router.use(authenticateToken); 
router.use(authorizeRoles('admin', 'manager')); // 💡💡💡 هذا السطر الجديد يفرض الأدوار 💡💡💡


// --- 1. مسار جلب آخر سداد لكل المشتركين ---
// 💡 ملاحظة: هذا المسار الآن محمي تلقائيًا بفضل `router.use` أعلاه.
router.get('/latest-payments', async (req, res) => {
    try {
        const latestPayments = await Receipt.aggregate([
            // تجميع السندات حسب المشترك
            {
                $group: {
                    _id: "$subscriber",
                    latestPaymentDate: { $max: "$date" }, // تاريخ آخر سداد
                    // لتحقيق "آخر سداد فعلي" بدقة أكبر، نحتاج لـ $sort و $first/$last
                    // ولكن لتجنب التعقيد الزائد الآن، سنبقيها هكذا ونفترض أن $max date يكفي
                    // ولجلب المبلغ المقابل لأحدث تاريخ، نحتاج لتطبيق $sort قبل الـ $group على كامل المستندات
                    // ثم $group للحصول على الأول/الأخير
                }
            },
            // دمج معلومات المشتركين
            {
                $lookup: {
                    from: 'subscribers', // اسم مجموعة المشتركين في قاعدة البيانات
                    localField: '_id',
                    foreignField: '_id',
                    as: 'subscriberInfo'
                }
            },
            {
                $unwind: '$subscriberInfo' // فك مصفوفة معلومات المشترك
            },
            // الآن لإضافة مبلغ آخر سداد بشكل صحيح، نحتاج لخطوة إضافية
            {
                $lookup: {
                    from: 'receipts',
                    let: { subId: '$_id', latestDate: '$latestPaymentDate' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$subscriber', '$$subId'] },
                                        { $eq: ['$date', '$$latestDate'] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } }, // إذا كان هناك عدة سندات بنفس التاريخ، خذ الأحدث إنشاءً
                        { $limit: 1 },
                        { $project: { amount: 1, _id: 0 } }
                    ],
                    as: 'latestReceiptDetails'
                }
            },
            {
                $unwind: {
                    path: '$latestReceiptDetails',
                    preserveNullAndEmptyArrays: true // للحفاظ على المشتركين الذين ليس لديهم سندات
                }
            },
            // إعادة تشكيل النتائج
            {
                $project: {
                    _id: 0,
                    subscriberId: '$_id',
                    subscriberName: '$subscriberInfo.name',
                    subscriberPhone: '$subscriberInfo.phone',
                    latestPaymentDate: 1,
                    latestPaymentAmount: { $ifNull: ['$latestReceiptDetails.amount', 0] } // استخدام المبلغ من التفاصيل الجديدة
                }
            },
            {
                $sort: { subscriberName: 1 } // ترتيب أبجدي حسب اسم المشترك
            }
        ]);

        res.json(latestPayments);
    } catch (error) {
        console.error('Error fetching latest payments:', error);
        res.status(500).send('Server Error');
    }
});

// --- 2. مسار جلب كشف حساب لمشترك محدد خلال فترة زمنية ---
// 💡 ملاحظة: هذا المسار الآن محمي تلقائيًا بفضل `router.use` أعلاه.
router.post('/statement', async (req, res) => {
    const { subscriberId, startDate, endDate } = req.body;

    if (!subscriberId) {
        return res.status(400).json({ msg: 'معرف المشترك مطلوب.' });
    }

    try {
        const subscriber = await Subscriber.findById(subscriberId).select('name phone');
        if (!subscriber) {
            return res.status(404).json({ msg: 'المشترك غير موجود.' });
        }

        const queryConditions = { subscriber: new mongoose.Types.ObjectId(subscriberId) };
        if (startDate) {
            queryConditions.date = { ...queryConditions.date, $gte: new Date(startDate) };
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999); // لتضمين اليوم كاملاً
            queryConditions.date = { ...queryConditions.date, $lte: endOfDay };
        }

        const receipts = await Receipt.find(queryConditions)
                                     .sort({ date: 1, receiptNumber: 1 });

        // حساب الإجمالي
        const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

        res.json({
            subscriberName: subscriber.name,
            subscriberPhone: subscriber.phone,
            statement: receipts,
            totalAmount: totalAmount
        });

    } catch (error) {
        console.error(`Error fetching statement for subscriber ${subscriberId}:`, error);
        res.status(500).send('Server Error');
    }
});

// --- 3. مسار جلب آخر سداد لمشترك واحد ---
// 💡 ملاحظة: هذا المسار الآن محمي تلقائيًا بفضل `router.use` أعلاه.
router.get('/latest-payment/:subscriberId', async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
        return res.status(400).json({ msg: 'معرف مشترك صالح مطلوب.' });
    }

    try {
        const subscriber = await Subscriber.findById(subscriberId).select('name phone');
        if (!subscriber) {
            return res.status(404).json({ msg: 'المشترك غير موجود.' });
        }

        const latestPayment = await Receipt.findOne({ subscriber: subscriberId })
                                         .sort({ date: -1, createdAt: -1 }) // الأحدث تاريخًا ثم الأحدث إنشاءً
                                         .select('amount date receiptNumber notes');

        if (!latestPayment) {
            return res.json({
                subscriberName: subscriber.name,
                subscriberPhone: subscriber.phone,
                latestPayment: null,
                msg: 'لا يوجد سداد سابق لهذا المشترك.'
            });
        }

        res.json({
            subscriberName: subscriber.name,
            subscriberPhone: subscriber.phone,
            latestPayment: latestPayment
        });

    } catch (error) {
        console.error(`Error fetching latest payment for subscriber ${subscriberId}:`, error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;