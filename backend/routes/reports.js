const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Deposit = require('../models/Deposit');
const Notebook = require('../models/Notebook');
const mongoose = require('mongoose');

router.post('/generate', async (req, res) => {
    const { reportType, filters } = req.body;
    try {
        let reportData;
        switch (reportType) {
            case 'detailed-periodic':
                reportData = await generateDetailedPeriodicReport(filters);
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

// --- العقل المدبر لتوليد التقرير (النسخة النهائية المصححة) ---
async function generateDetailedPeriodicReport(filters) {
    const { startDate, endDate, collectorId } = filters;

    const finalStartDate = new Date(startDate);
    const finalEndDate = new Date(endDate);
    finalEndDate.setUTCHours(23, 59, 59, 999);

    const queryConditions = {};
    if (collectorId) {
        queryConditions.collector = new mongoose.Types.ObjectId(collectorId);
    }

    // 1. جلب كل البيانات المطلوبة
    const receipts = await Receipt.find({ ...queryConditions, date: { $gte: finalStartDate, $lte: finalEndDate } }).populate('collector', 'name').sort({ date: 1, receiptNumber: 1 });
    const deposits = await Deposit.find({ ...queryConditions, depositDate: { $gte: finalStartDate, $lte: finalEndDate } }).populate('collector', 'name');
    const notebooks = await Notebook.find(collectorId ? { collector: queryConditions.collector } : {});

    // 2. تنظيم التوريدات في خريطة لسهولة الوصول
    const depositsByCollectorDate = new Map();
    deposits.forEach(d => {
        const dateStr = new Date(d.depositDate).toISOString().split('T')[0];
        const key = `${d.collector._id}_${dateStr}`;
        if (!depositsByCollectorDate.has(key)) {
            depositsByCollectorDate.set(key, { items: [], collectorName: d.collector.name });
        }
        depositsByCollectorDate.get(key).items.push(d);
    });

    // 3. تجميع السندات حسب (المحصل > التاريخ > الدفتر)
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

    // 4. بناء صفوف التقرير من مجموعات السندات
    for (const group of Object.values(groupedReceipts)) {
        const totalAmount = group.receipts.reduce((sum, r) => sum + r.amount, 0);
        const depositKey = `${group.collectorId}_${group.date}`;
        const relevantDeposits = depositsByCollectorDate.get(depositKey)?.items || [];
        processedDepositKeys.add(depositKey);
        
        const totalDeposit = relevantDeposits.reduce((sum, d) => sum + d.amount, 0);

        reportRows.push({
            collectorName: group.collectorName, date: group.date,
            fromReceipt: group.receipts[0].receiptNumber, toReceipt: group.receipts[group.receipts.length - 1].receiptNumber,
            receiptCount: group.receipts.length, totalAmount,
            depositAmount: totalDeposit, netAmount: totalAmount - totalDeposit,
            depositReceipt: relevantDeposits.map(d => d.referenceNumber).join(', ') || '-',
            depositDate: group.date, notes: ''
        });
    }

    // 5. إضافة صفوف للتوريدات التي حدثت في أيام لا يوجد بها تحصيل
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

    // 6. فرز كل الصفوف زمنيًا
    return reportRows.sort((a, b) => new Date(a.date) - new Date(b.date) || a.fromReceipt - b.fromReceipt);
}

// --- بقية المسارات تبقى كما هي ---
module.exports = router;

