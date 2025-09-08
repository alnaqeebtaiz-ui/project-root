const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Deposit = require('../models/Deposit');
const Collector = require('../models/Collector'); // <-- تم استيراد مودل المحصل
const mongoose = require('mongoose');

router.post('/generate', async (req, res) => {
    const { reportType, filters } = req.body;
    try {
        let reportData;
        switch (reportType) {
            case 'detailed-periodic':
                reportData = await generateDetailedPeriodicReport(filters);
                break;
            case 'periodic-summary-table':
                reportData = await generatePeriodicSummaryReport(filters);
                break;
            default:
                return res.status(400).json({ msg: 'نوع التقرير غير معروف' });
        }
        res.json(reportData);
    } catch (error) {
        console.error(`Error generating report ${reportType}:`, error);
        res.status(500).send('Server Error');
    }
});

// =================================================================
// ===== منطق التقرير الجديد: الجدول التجميعي الدوري (تم التحديث) =====
// =================================================================

function getCycleDates(year, month) {
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const dates = {
        1: { start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)), end: new Date(Date.UTC(year, month - 1, 10, 23, 59, 59, 999)) },
        2: { start: new Date(Date.UTC(year, month - 1, 11, 0, 0, 0)), end: new Date(Date.UTC(year, month - 1, 20, 23, 59, 59, 999)) },
        3: { start: new Date(Date.UTC(year, month - 1, 21, 0, 0, 0)), end: new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59, 999)) }
    };
    return dates;
}

async function generatePeriodicSummaryReport(filters) {
    const { year, month, fromCycle, toCycle } = filters;

    const allCycleDates = getCycleDates(year, month);
    const firstCycleStartDate = allCycleDates[fromCycle].start;
    
    // --- التعديل الرئيسي يبدأ هنا ---

    // 1. جلب كل العمليات (سندات وتوريدات) حتى نهاية الدورة المطلوبة
    const allReceipts = await Receipt.find({ date: { $lt: allCycleDates[toCycle].end } }).populate('collector', '_id name').lean();
    const allDeposits = await Deposit.find({ depositDate: { $lt: allCycleDates[toCycle].end } }).populate('collector', '_id name').lean();

    // 2. تحديد المحصلين الذين لديهم نشاط واستخراج IDs الخاصة بهم
    const collectorIds = new Set();
    [...allReceipts, ...allDeposits].forEach(item => {
        if (item.collector) collectorIds.add(item.collector._id.toString());
    });
    
    // 3. جلب بيانات المحصلين الكاملة (بما في ذلك الرصيد الافتتاحي) دفعة واحدة
    const collectorsData = await Collector.find({ _id: { $in: [...collectorIds] } }).lean();

    // 4. بناء خريطة للمحصلين تحتوي على بياناتهم الكاملة
    const collectorsMap = new Map();
    collectorsData.forEach(c => {
        collectorsMap.set(c._id.toString(), {
            ...c,
            currentBalance: c.openingBalance || 0 // ابدأ الرصيد بالرصيد الافتتاحي المسجل
        });
    });

    // 5. تحديث الرصيد بإضافة العمليات التاريخية (التي حدثت قبل بداية التقرير)
    collectorsMap.forEach(collector => {
        const pastReceiptsTotal = allReceipts
            .filter(r => r.collector._id.toString() === collector._id.toString() && new Date(r.date) < firstCycleStartDate)
            .reduce((sum, r) => sum + r.amount, 0);
            
        const pastDepositsTotal = allDeposits
            .filter(d => d.collector._id.toString() === collector._id.toString() && new Date(d.depositDate) < firstCycleStartDate)
            .reduce((sum, d) => sum + d.amount, 0);

        // الرصيد الافتتاحي الحقيقي = الرصيد المسجل + صافي العمليات السابقة
        collector.currentBalance += (pastReceiptsTotal - pastDepositsTotal);
    });

    // --- نهاية التعديل الرئيسي ---

    // 6. المرور على كل دورة مطلوبة (هذا الجزء يبقى كما هو)
    const finalReportData = [];
    for (let i = fromCycle; i <= toCycle; i++) {
        const cycleDates = allCycleDates[i];
        const cycleRows = [];

        collectorsMap.forEach(collector => {
            const openingBalance = collector.currentBalance;

            const cycleReceipts = allReceipts.filter(r => r.collector._id.toString() === collector._id.toString() && new Date(r.date) >= cycleDates.start && new Date(r.date) <= cycleDates.end);
            const cycleDeposits = allDeposits.filter(d => d.collector._id.toString() === collector._id.toString() && new Date(d.depositDate) >= cycleDates.start && new Date(d.depositDate) <= cycleDates.end);

            const totalCollection = cycleReceipts.reduce((sum, r) => sum + r.amount, 0);
            const assignmentCount = cycleReceipts.length;
            const totalDeposit = cycleDeposits.reduce((sum, d) => sum + d.amount, 0);
            const netAmount = openingBalance + totalCollection - totalDeposit;
            
            cycleRows.push({ collectorName: collector.name, openingBalance, assignmentCount, totalCollection, totalDeposit, netAmount, notes: "" });
            collector.currentBalance = netAmount;
        });
        
        const subTotal = {
             openingBalance: cycleRows.reduce((sum, r) => sum + r.openingBalance, 0),
             assignmentCount: cycleRows.reduce((sum, r) => sum + r.assignmentCount, 0),
             totalCollection: cycleRows.reduce((sum, r) => sum + r.totalCollection, 0),
             totalDeposit: cycleRows.reduce((sum, r) => sum + r.totalDeposit, 0),
             netAmount: cycleRows.reduce((sum, r) => sum + r.netAmount, 0),
        };

        finalReportData.push({
            cycle: i,
            title: `الدورة ${i} — من ${cycleDates.start.toISOString().split('T')[0]} إلى ${cycleDates.end.toISOString().split('T')[0]}`,
            rows: cycleRows.sort((a,b) => a.collectorName.localeCompare(b.collectorName, 'ar')),
            subTotal: subTotal
        });
    }
    
    return finalReportData;
}


// --- (بقية الكود الخاص بالتقرير التفصيلي يبقى كما هو بدون تغيير) ---
async function generateDetailedPeriodicReport(filters) {
    // ... no changes here
    const { startDate, endDate, collectorId } = filters;
    const finalStartDate = new Date(startDate);
    const finalEndDate = new Date(endDate);
    finalEndDate.setUTCHours(23, 59, 59, 999);
    const queryConditions = {};
    if (collectorId) {
        queryConditions.collector = new mongoose.Types.ObjectId(collectorId);
    }
    const receipts = await Receipt.find({ ...queryConditions, date: { $gte: finalStartDate, $lte: finalEndDate } }).populate('collector', 'name').sort({ date: 1, receiptNumber: 1 });
    const deposits = await Deposit.find({ ...queryConditions, depositDate: { $gte: finalStartDate, $lte: finalEndDate } }).populate('collector', 'name');
    const depositsByCollectorDate = new Map();
    deposits.forEach(d => {
        const dateStr = new Date(d.depositDate).toISOString().split('T')[0];
        const key = `${d.collector._id}_${dateStr}`;
        if (!depositsByCollectorDate.has(key)) {
            depositsByCollectorDate.set(key, { items: [], collectorName: d.collector.name });
        }
        depositsByCollectorDate.get(key).items.push(d);
    });
    const groupedReceipts = {};
    receipts.forEach(r => {
        const dateStr = new Date(r.date).toISOString().split('T')[0];
        const notebookStart = Math.floor((r.receiptNumber - 1) / 50) * 50 + 1;
        const groupKey = `${r.collector._id}_${dateStr}_${notebookStart}`;
        if (!groupedReceipts[groupKey]) {
            groupedReceipts[groupKey] = { collectorName: r.collector.name, collectorId: r.collector._id, date: dateStr, notebookStart, receipts: [] };
        }
        groupedReceipts[groupKey].receipts.push(r);
    });
    let reportRows = [];
    const processedDepositKeys = new Set();
    const depositsShownForDay = new Set();
    for (const group of Object.values(groupedReceipts)) {
        const totalAmount = group.receipts.reduce((sum, r) => sum + r.amount, 0);
        const depositKey = `${group.collectorId}_${group.date}`;
        let depositAmount = 0;
        let depositReceipt = '-';
        if (!depositsShownForDay.has(depositKey)) {
            const relevantDeposits = depositsByCollectorDate.get(depositKey)?.items || [];
            if (relevantDeposits.length > 0) {
                depositAmount = relevantDeposits.reduce((sum, d) => sum + d.amount, 0);
                depositReceipt = relevantDeposits.map(d => d.referenceNumber).join(', ') || '-';
            }
            depositsShownForDay.add(depositKey);
        }
        processedDepositKeys.add(depositKey);
        reportRows.push({
            collectorName: group.collectorName, date: group.date,
            fromReceipt: group.receipts[0].receiptNumber, toReceipt: group.receipts[group.receipts.length - 1].receiptNumber,
            receiptCount: group.receipts.length, totalAmount,
            depositAmount: depositAmount,
            netAmount: totalAmount - depositAmount,
            depositReceipt: depositReceipt,
            depositDate: group.date, notes: ''
        });
    }
    for (const [key, depositData] of depositsByCollectorDate.entries()) {
        if (!processedDepositKeys.has(key)) {
            const date = key.split('_')[1];
            const totalDeposit = depositData.items.reduce((sum, d) => sum + d.amount, 0);
            reportRows.push({
                collectorName: depositData.collectorName, date: date,
                fromReceipt: '-', toReceipt: '-', receiptCount: 0, totalAmount: 0,
                depositAmount: totalDeposit, netAmount: -totalDeposit,
                depositReceipt: depositData.items.map(d => d.referenceNumber).join(', ') || '-',
                depositDate: date, notes: 'توريد فقط'
            });
        }
    }
    return reportRows.sort((a, b) => new Date(a.date) - new Date(b.date) || a.fromReceipt - b.fromReceipt);
}

module.exports = router;