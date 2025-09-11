const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// استيراد الموديلات اللازمة
const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Notebook = require('../models/Notebook');
const Deposit = require('../models/Deposit');
const Fund = require('../models/Fund');

// استيراد middleware الأمان
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware'); // <--- إضافة هذا السطر

// @route   GET api/dashboard/summary
// @desc    Get all summary data for the dashboard
// @access  Private (بواسطة authenticateToken)
router.get('/summary', authenticateToken, async (req, res) => { // <--- إضافة authenticateToken هنا
    try {
        // --- 1. تحديد نطاقات التواريخ ---
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setHours(0, 0, 0, 0); // التأكد من أن اليوم يبدأ من 00:00:00

        // --- 2. جلب البيانات باستخدام Promise.all للكفاءة ---
        const [
            totalCollectedThisMonth,
            activeCollectorsCount,
            receiptsTodayCount,
            totalMissingReceipts,
            monthlyCollectionData,
            collectionByFundData,
            last5Receipts,
            last5Deposits
        ] = await Promise.all([
            // إجمالي التحصيل هذا الشهر
            Receipt.aggregate([
                { $match: { date: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            // عدد المحصلين
            Collector.countDocuments(),
            // عدد سندات اليوم
            Receipt.countDocuments({ date: { $gte: todayStart } }),
            // إجمالي السندات المفقودة
            Notebook.aggregate([
                { $project: { missingCount: { $size: '$missingReceipts' } } },
                { $group: { _id: null, total: { $sum: '$missingCount' } } }
            ]),
            // بيانات مخطط الأعمدة (آخر 6 أشهر)
            Receipt.aggregate([
                { $match: { date: { $gte: sixMonthsAgo } } },
                { $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            // بيانات المخطط الدائري (حسب الصندوق)
            Receipt.aggregate([
                { $lookup: { from: 'collectors', localField: 'collector', foreignField: '_id', as: 'collectorInfo' } },
                { $unwind: '$collectorInfo' },
                { $lookup: { from: 'funds', localField: 'collectorInfo.fund', foreignField: '_id', as: 'fundInfo' } },
                { $unwind: '$fundInfo' },
                { $group: { _id: '$fundInfo.name', total: { $sum: '$amount' } } }
            ]),
            // آخر 5 سندات
            Receipt.find().sort({ createdAt: -1 }).limit(5).populate('collector', 'name'),
            // آخر 5 توريدات
            Deposit.find().sort({ createdAt: -1 }).limit(5).populate('collector', 'name'),
        ]);

        // --- 3. تجهيز البيانات النهائية للإرسال ---
        const summary = {
            kpiCards: {
                totalCollectedThisMonth: totalCollectedThisMonth[0]?.total || 0,
                activeCollectorsCount: activeCollectorsCount || 0,
                receiptsTodayCount: receiptsTodayCount || 0,
                totalMissingReceipts: totalMissingReceipts[0]?.total || 0,
            },
            barChartData: {
                labels: monthlyCollectionData.map(item => `${item._id.year}-${String(item._id.month).padStart(2, '0')}`),
                values: monthlyCollectionData.map(item => item.total)
            },
            doughnutChartData: {
                labels: collectionByFundData.map(item => item._id),
                values: collectionByFundData.map(item => item.total)
            },
            recentActivities: {
                lastReceipts: last5Receipts,
                lastDeposits: last5Deposits
            }
        };

        res.json(summary);

    } catch (error) {
        console.error("Dashboard Summary Error:", error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;