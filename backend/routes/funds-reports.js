const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Receipt = require('../models/Receipt');
const Deposit = require('../models/Deposit');
const Collector = require('../models/Collector');
const Notebook = require('../models/Notebook');
const Fund = require('../models/Fund'); // <-- استيراد مودل الصندوق

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 سطر جديد تمت إضافته هنا: لتطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡💡💡
// هذا يعني أن أي شخص يحاول الوصول لأي من مسارات تقارير الصناديق يجب أن يكون مسجل دخول (لديه توكن صالح).
// بالإضافة إلى ذلك، يجب أن يكون لديه دور "admin" أو "manager".
router.use(authenticateToken); 
router.use(authorizeRoles('admin', 'manager')); // 💡💡💡 هذا السطر الجديد يفرض الأدوار 💡💡💡


// @route   POST api/funds-reports/generate
// 💡 ملاحظة: هذا المسار الآن محمي تلقائيًا بفضل `router.use` أعلاه.
router.post('/generate', async (req, res) => {
    const { reportType, filters } = req.body;
    try {
        let data;
        if (reportType === 'periodic') {
            data = await generatePeriodicReport(filters);
        } else if (reportType === 'annual') {
            data = await generateAnnualReport(filters);
        } else {
            return res.status(400).json({ msg: 'نوع التقرير غير معروف' });
        }
        res.json(data);
    } catch (error) {
        console.error(`Error generating ${reportType} report:`, error);
        res.status(500).send('Server Error');
    }
});

// --- العقل المدبر للتقرير الدوري (بناءً على الصناديق) ---
async function generatePeriodicReport(filters) {
    const { year, month, fromCycle, toCycle } = filters;
    
    // 💡 يمكن إضافة فلتر fundId هنا إذا أردنا السماح للمستخدمين باختيار صندوق معين
    const funds = await Fund.find().lean(); // حاليًا يجلب كل الصناديق
    const finalReport = [];

    for (let cycle = fromCycle; cycle <= toCycle; cycle++) {
        const cycleDates = getCycleDates(year, month, cycle);
        const cycleRows = [];

        for (const fund of funds) {
            const collectorsInFund = await Collector.find({ fund: fund._id }).lean();
            const collectorIds = collectorsInFund.map(c => c._id);
            if (collectorIds.length === 0) continue;

            // 1. حساب الرصيد الافتتاحي للصندوق
            const openingBalances = collectorsInFund.reduce((sum, c) => sum + (c.openingBalance || 0), 0);
            const balanceBefore = await calculateBalanceUntil(collectorIds, cycleDates.start);
            const openingBalance = openingBalances + balanceBefore.net;

            // 2. حساب حركات الدورة الحالية للصندوق
            const receiptsInCycle = await Receipt.find({ collector: { $in: collectorIds }, date: { $gte: cycleDates.start, $lt: cycleDates.end } }).lean();
            const depositsInCycle = await Deposit.find({ collector: { $in: collectorIds }, depositDate: { $gte: cycleDates.start, $lt: cycleDates.end } }).lean();

            const totalCollection = receiptsInCycle.reduce((sum, r) => sum + r.amount, 0);
            const totalDeposit = depositsInCycle.reduce((sum, d) => sum + d.amount, 0);

            cycleRows.push({
                fundName: fund.name,
                openingBalance,
                assignmentCount: receiptsInCycle.length,
                totalCollection,
                totalDeposit,
                netAmount: openingBalance + totalCollection - totalDeposit,
                notes: ""
            });
        }
        
        const subTotal = cycleRows.reduce((totals, row) => {
            totals.openingBalance += row.openingBalance;
            totals.assignmentCount += row.assignmentCount;
            totals.totalCollection += row.totalCollection;
            totals.totalDeposit += row.totalDeposit;
            totals.netAmount += row.netAmount;
            return totals;
        }, { openingBalance: 0, assignmentCount: 0, totalCollection: 0, totalDeposit: 0, netAmount: 0 });

        finalReport.push({
            cycle: cycle,
            title: `الدورة ${cycle} — من ${cycleDates.start.toISOString().split('T')[0]} إلى ${cycleDates.end.toISOString().split('T')[0]}`,
            rows: cycleRows,
            subTotal: subTotal
        });
    }
    return finalReport;
}

// --- العقل المدبر للتقرير السنوي (بناءً على الصناديق) ---
async function generateAnnualReport(filters) {
    const { year, fundId } = filters;

    let collectorIds;
    if (fundId) {
        // حالة اختيار صندوق معين
        const collectorsInFund = await Collector.find({ fund: fundId }).lean();
        collectorIds = collectorsInFund.map(c => c._id);
    } else {
        // حالة "كل الصناديق"
        const allCollectors = await Collector.find().lean();
        collectorIds = allCollectors.map(c => c._id);
    }
    
    if (collectorIds.length === 0) {
        const emptyTotals = { totalCollection: 0, totalDeposit: 0, netAmount: 0, receiptCount: 0, missingCount: 0 };
        return { monthlyData: [], totals: emptyTotals };
    }

    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

        // جلب سندات وتحويلات الشهر الحالي
        const receipts = await Receipt.find({ collector: { $in: collectorIds }, date: { $gte: monthStart, $lte: monthEnd } }).lean();
        const deposits = await Deposit.find({ collector: { $in: collectorIds }, depositDate: { $gte: monthStart, $lte: monthEnd } }).lean();
        
        const totalCollection = receipts.reduce((sum, r) => sum + r.amount, 0);
        const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

        // --- المنطق الجديد والدقيق لحساب المفقودات ---
        let missingCount = 0;
        if (receipts.length > 0) {
            // 1. نحدد ما هي الدفاتر التي تم استخدامها في هذا الشهر
            const notebooksUsedStarts = [...new Set(receipts.map(r => Math.floor((r.receiptNumber - 1) / 50) * 50 + 1))];
            
            // 2. نجلب بيانات هذه الدفاتر فقط التي تتبع المحصلين ضمن الصندوق/الصناديق المختارة
            const notebooksData = await Notebook.find({ 
                startNumber: { $in: notebooksUsedStarts }, 
                collectorId: { $in: collectorIds } // 💡 فلتر إضافي للتأكد من المحصلين
            }).lean();
            
            // 3. نجمع عدد المفقودات من هذه الدفاتر
            missingCount = notebooksData.reduce((sum, n) => sum + n.missingReceipts.length, 0);
        }
        // ---------------------------------------------

        monthlyData.push({
            month: monthStart.toLocaleString('ar-SA', { month: 'long' }),
            totalCollection,
            totalDeposit,
            netAmount: totalCollection - totalDeposit,
            receiptCount: receipts.length,
            missingCount // <-- الآن القيمة صحيحة للشهر الحالي
        });
    }
    
    const totals = monthlyData.reduce((acc, month) => {
        acc.totalCollection += month.totalCollection;
        acc.totalDeposit += month.totalDeposit;
        acc.netAmount += month.netAmount;
        acc.receiptCount += month.receiptCount;
        acc.missingCount += month.missingCount;
        return acc;
    }, { totalCollection: 0, totalDeposit: 0, netAmount: 0, receiptCount: 0, missingCount: 0 });

    return { monthlyData, totals };
}
    

// --- دوال مساعدة ---
function getCycleDates(year, month, cycle) {
    const jsMonth = month - 1;
    if (cycle == 1) return { start: new Date(year, jsMonth, 1), end: new Date(year, jsMonth, 11) };
    if (cycle == 2) return { start: new Date(year, jsMonth, 11), end: new Date(year, jsMonth, 21) };
    if (cycle == 3) return { start: new Date(year, jsMonth, 21), end: new Date(year, jsMonth + 1, 1) };
}

async function calculateBalanceUntil(collectorIds, date) {
    if (collectorIds.length === 0) return { net: 0 };
    const receipts = await Receipt.aggregate([
        { $match: { collector: { $in: collectorIds }, date: { $lt: date } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const deposits = await Deposit.aggregate([
        { $match: { collector: { $in: collectorIds }, depositDate: { $lt: date } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalReceipts = receipts.length > 0 ? receipts[0].total : 0;
    const totalDeposits = deposits.length > 0 ? deposits[0].total : 0;
    return { net: totalReceipts - totalDeposits };
}

module.exports = router;