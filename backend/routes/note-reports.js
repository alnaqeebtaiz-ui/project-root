// ... داخل مجلد الـ Backend/routes/note-reports.js
const express = require('express');
const router = express.Router();

const Notebook = require('../models/Notebook');
const Collector = require('../models/Collector');
// ⚠️ لا تستورد أو تستخدم هنا أي middleware للمصادقة (مثل 'auth') إذا كانت هذه المسارات عامة.
// إذا كان ملفك يحتوي على سطر مثل: const auth = require('../middleware/auth');
// وتستخدمه في هذه المسارات، فيجب إزالته من هذه المسارات بالتحديد.

// ===============================================
// 1. تقرير نظرة عامة على حالة الدفاتر (بدون حماية)
// GET /api/note-reports/notebook-overview
// ===============================================
router.get('/notebook-overview', async (req, res) => { // 👈 تأكد أنه لا يوجد هنا 'auth' أو أي middleware حماية
    try {
        const { collectorId, notebookStatus, hasMissing, hasPending } = req.query;

        let matchQuery = {};
        if (collectorId) {
            matchQuery.collector = collectorId;
        }

        const notebooks = await Notebook.find(matchQuery)
            .populate('collector', 'name')
            .sort({ 'collector.name': 1, startNumber: 1 });

        const reportData = notebooks.map(notebook => {
            const totalReceipts = notebook.endNumber - notebook.startNumber + 1;
            const usedReceiptsCount = totalReceipts - notebook.missingReceipts.length - notebook.pendingReceipts.length;

            let status = 'متاح';
            if (notebook.missingReceipts.length > 0) {
                status = 'مفقود';
            } else if (usedReceiptsCount === totalReceipts && totalReceipts > 0) {
                status = 'ممتلئ';
            } else if (usedReceiptsCount > 0) {
                status = 'مستخدم جزئيًا';
            } else if (totalReceipts === 0) {
                status = 'دفتر فارغ';
            }


            return {
                notebookId: notebook._id,
                notebookRange: `${notebook.startNumber} - ${notebook.endNumber}`,
                collectorName: notebook.collectorName || (notebook.collector ? notebook.collector.name : 'N/A'),
                createdAt: notebook.createdAt,
                totalReceipts,
                usedReceiptsCount,
                missingReceiptsCount: notebook.missingReceipts.length,
                pendingReceiptsCount: notebook.pendingReceipts.length,
                completionPercentage: totalReceipts > 0 ? ((usedReceiptsCount / totalReceipts) * 100).toFixed(2) : 0,
                status: status,
                updatedAt: notebook.updatedAt
            };
        });

        let filteredReportData = reportData.filter(item => {
            let pass = true;
            if (hasMissing === 'yes' && item.missingReceiptsCount === 0) pass = false;
            if (hasMissing === 'no' && item.missingReceiptsCount > 0) pass = false;
            if (hasPending === 'yes' && item.pendingReceiptsCount === 0) pass = false;
            if (hasPending === 'no' && item.pendingReceiptsCount > 0) pass = false;
            if (notebookStatus && notebookStatus !== 'all' && item.status !== notebookStatus) pass = false;
            return pass;
        });

        res.json(filteredReportData);
    } catch (error) {
        console.error('Error fetching notebook overview report:', error.message);
        res.status(500).send('Server Error');
    }
});

// ===============================================
// 2. تقرير تفاصيل السندات المفقودة (بدون حماية)
// GET /api/note-reports/missing-receipts-details
// ===============================================
router.get('/missing-receipts-details', async (req, res) => { // 👈 تأكد أنه لا يوجد هنا 'auth' أو أي middleware حماية
    try {
        const { collectorId, searchText } = req.query;
        
        let matchQuery = {};
        if (collectorId) {
            matchQuery.collector = collectorId;
        }

        const notebooks = await Notebook.find(matchQuery)
            .populate('collector', 'name');

        let allMissingReceipts = [];

        notebooks.forEach(notebook => {
            notebook.missingReceipts.forEach(missing => {
                let item = {
                    notebookRange: `${notebook.startNumber} - ${notebook.endNumber}`,
                    collectorName: notebook.collectorName || (notebook.collector ? notebook.collector.name : 'N/A'),
                    receiptNumber: missing.receiptNumber,
                    note: missing.notes,
                    discoveredAt: missing.estimatedDate
                };
                allMissingReceipts.push(item);
            });
        });

        if (searchText) {
            const searchRegex = new RegExp(searchText, 'i');
            allMissingReceipts = allMissingReceipts.filter(item =>
                item.note && searchRegex.test(item.note)
            );
        }

        res.json(allMissingReceipts);
    } catch (error) {
        console.error('Error fetching missing receipts details report:', error.message);
        res.status(500).send('Server Error');
    }
});

// ===============================================
// مسار لجلب المحصلين - مطلوب للصفحة الأمامية (بدون حماية)
// GET /api/note-reports/collectors
// ===============================================
router.get('/collectors', async (req, res) => { // 👈 تأكد أنه لا يوجد هنا 'auth' أو أي middleware حماية
    try {
        const collectors = await Collector.find().select('_id name');
        res.json(collectors);
    } catch (error) {
        console.error('Error fetching collectors:', error.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;