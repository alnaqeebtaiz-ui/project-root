// C:\Users\khalid\Downloads\project-root\backend\routes\dashboard.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Receipt = require('../models/Receipt');
const Collector = require('../models/Collector');
const Notebook = require('../models/Notebook');
const Deposit = require('../models/Deposit');
const Fund = require('../models/Fund');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware'); // Keep this line for security

router.get('/summary', authenticateToken, async (req, res) => { // Keep authenticateToken here
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setHours(0, 0, 0, 0);

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
            Receipt.aggregate([
                { $match: { date: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Collector.countDocuments(),
            Receipt.countDocuments({ date: { $gte: todayStart } }),
            Notebook.aggregate([
                { $project: { missingCount: { $size: '$missingReceipts' } } },
                { $group: { _id: null, total: { $sum: '$missingCount' } } }
            ]),
            Receipt.aggregate([
                { $match: { date: { $gte: sixMonthsAgo } } },
                { $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Receipt.aggregate([
                { $lookup: { from: 'collectors', localField: 'collector', foreignField: '_id', as: 'collectorInfo' } },
                { $unwind: '$collectorInfo' },
                { $lookup: { from: 'funds', localField: 'collectorInfo.fund', foreignField: '_id', as: 'fundInfo' } },
                { $unwind: '$fundInfo' },
                { $group: { _id: '$fundInfo.name', total: { $sum: '$amount' } } }
            ]),
            Receipt.find().sort({ createdAt: -1 }).limit(5).populate('collector', 'name'),
            Deposit.find().sort({ createdAt: -1 }).limit(5).populate('collector', 'name'),
        ]);

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