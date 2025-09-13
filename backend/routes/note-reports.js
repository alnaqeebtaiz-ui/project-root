const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// استيراد الموديلات الضرورية
const Notebook = require('../models/Notebook');
const Collector = require('../models/Collector');

// 💡 استيراد دوال الحماية للمصادقة وتفويض الأدوار 💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡 تطبيق الحماية الأساسية على جميع المسارات في هذا الملف 💡
// هذا يعني أن جميع المسارات هنا تتطلب توكن مصادقة صالح ودور "admin" أو "manager"
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager')); // يمكنك تعديل الأدوار حسب متطلباتك

// ===============================================
// @route   GET /api/note-reports/missing-receipts
// @desc    جلب تقرير السندات المفقودة مع الفلاتر
// @access  Private (يتطلب المصادقة ودور 'admin' أو 'manager')
// ===============================================
router.get('/missing-receipts', async (req, res) => {
    try {
        const { collectorId, startDate, endDate } = req.query;

        let matchQuery = {};
        if (collectorId && collectorId !== 'all') { // فلتر المحصل
            matchQuery.collector = collectorId;
        }

        const notebooks = await Notebook.find(matchQuery)
            .populate('collector', 'name') // لجلب اسم المحصل
            .sort({ 'collector.name': 1, startNumber: 1 }); // ترتيب حسب المحصل ثم رقم الدفتر

        let allMissingReceipts = [];

        notebooks.forEach(notebook => {
            notebook.missingReceipts.forEach(missing => {
                // فلترة حسب التاريخ التقديري (estimatedDate) إذا تم توفيرها
                const estimatedDate = new Date(missing.estimatedDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                // تأكد أن endDate يشمل اليوم بأكمله
                if (end) {
                    end.setUTCHours(23, 59, 59, 999);
                }
                
                if ((!start || estimatedDate >= start) && (!end || estimatedDate <= end)) {
                    allMissingReceipts.push({
                        collectorName: notebook.collector ? notebook.collector.name : 'N/A', // اسم المحصل
                        receiptNumber: missing.receiptNumber,
                        notebookRange: `${notebook.startNumber} - ${notebook.endNumber}`,
                        estimatedDate: missing.estimatedDate, // يسحب كما هو من قاعدة البيانات
                        status: 'مفقود', // الحالة ثابتة هنا لأن التقرير للمفقودات فقط
                        notes: missing.notes || 'لا يوجد'
                    });
                }
            });
        });

        // ترتيب النتائج النهائية (اختياري: يمكن ترتيبها حسب التاريخ التقديري أو رقم السند)
        allMissingReceipts.sort((a, b) => {
            // يمكن تعديل هذا الترتيب حسب الأولوية
            if (a.collectorName < b.collectorName) return -1;
            if (a.collectorName > b.collectorName) return 1;
            return a.receiptNumber - b.receiptNumber;
        });

        res.json(allMissingReceipts);

    } catch (error) {
        console.error('Error fetching missing receipts report:', error.message);
        res.status(500).send('Server Error');
    }
});

// ===============================================
// @route   GET /api/note-reports/collectors
// @desc    جلب قائمة المحصلين
// @access  Private (يتطلب المصادقة ودور 'admin' أو 'manager')
// ===============================================
router.get('/collectors', async (req, res) => {
    try {
        const collectors = await Collector.find().select('_id name');
        res.json(collectors);
    } catch (error) {
        console.error('Error fetching collectors:', error.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;