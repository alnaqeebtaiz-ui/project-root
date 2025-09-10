const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Notebook = require('../models/Notebook');
const mongoose = require('mongoose');
const Collector = require('../models/Collector');


// --- تم تعديل هذا المسار بالكامل ليدعم "المزامنة الذكية" مع إضافة التاريخ التقديري ---
router.post('/sync', async (req, res) => {
    try {
        const lastNotebookUpdate = await Notebook.findOne().sort({ updatedAt: -1 });
        let receiptsToProcess;

        if (lastNotebookUpdate) {
            // المزامنة الذكية: جلب السندات الجديدة فقط
            receiptsToProcess = await Receipt.find({
                createdAt: { $gt: lastNotebookUpdate.updatedAt }
            }).populate('collector', 'name');
            if (receiptsToProcess.length === 0) {
                return res.json({ message: 'لا توجد سندات جديدة للمزامنة.' });
            }
        } else {
            // المزامنة الكاملة لأول مرة
            receiptsToProcess = await Receipt.find().populate('collector', 'name');
            if (receiptsToProcess.length === 0) {
                return res.json({ message: 'لا توجد سندات للمزامنة.' });
            }
            await Notebook.deleteMany({});
        }

        const notebooksToUpdate = new Map();
        for (const receipt of receiptsToProcess) {
            const startNumber = Math.floor((receipt.receiptNumber - 1) / 50) * 50 + 1;
            const collectorId = receipt.collector ? receipt.collector._id.toString() : 'unassigned';
            const key = `${startNumber}_${collectorId}`;
            if (!notebooksToUpdate.has(key)) {
                notebooksToUpdate.set(key, { startNumber, collectorId });
            }
        }

        for (const notebookData of notebooksToUpdate.values()) {
            const { startNumber, collectorId } = notebookData;
            const endNumber = startNumber + 49;

            const allUsedReceiptsInDB = await Receipt.find({
                collector: collectorId,
                receiptNumber: { $gte: startNumber, $lte: endNumber }
            }).sort({ receiptNumber: 1 }); // فرز تصاعدي مهم جدًا هنا

            if (allUsedReceiptsInDB.length === 0) continue;

            const existingNumbers = new Set(allUsedReceiptsInDB.map(r => r.receiptNumber));
            const receiptDateMap = new Map(allUsedReceiptsInDB.map(r => [r.receiptNumber, r.date]));
            
            const collectorName = allUsedReceiptsInDB[0]?.collector?.name || 'غير محدد';
            const minUsed = Math.min(...existingNumbers);
            const maxUsed = Math.max(...existingNumbers);
            const missingInThisNotebook = [];
            const pendingInThisNotebook = [];

            for (let j = startNumber; j <= endNumber; j++) {
                if (existingNumbers.has(j)) continue;

                if (j > minUsed && j < maxUsed) {
                    // --- منطق حساب التاريخ التقديري ---
                    let estimatedDate = null;
                    // ابحث عن السند المستخدم الذي قبله مباشرة
                    let prevReceipt = allUsedReceiptsInDB.filter(r => r.receiptNumber < j).pop();
                    if (prevReceipt) {
                        estimatedDate = prevReceipt.date;
                    } else {
                        // إذا لم يوجد قبله، ابحث عن أول سند بعده
                        let nextReceipt = allUsedReceiptsInDB.find(r => r.receiptNumber > j);
                        if(nextReceipt) {
                            estimatedDate = nextReceipt.date;
                        }
                    }
                    missingInThisNotebook.push({ receiptNumber: j, status: 'مفقود', estimatedDate: estimatedDate });
                } else if (j > maxUsed) {
                    pendingInThisNotebook.push(j);
                }
            }
            
            const updatePayload = {
                startNumber, endNumber, collectorId, collectorName,
                missingReceipts: missingInThisNotebook,
                pendingReceipts: pendingInThisNotebook,
                minUsedInNotebook: minUsed,
                maxUsedInNotebook: maxUsed,
                status: (pendingInThisNotebook.length === 0 && (maxUsed === endNumber || existingNumbers.size === 50)) ? 'مكتمل' : 'قيد الاستخدام'
            };
            
            await Notebook.findOneAndUpdate(
                { startNumber: startNumber, collectorId: collectorId },
                updatePayload,
                { upsert: true, new: true }
            );
        }

        res.json({ message: `تمت مزامنة وتحديث ${notebooksToUpdate.size} دفتر بنجاح.` });

    } catch (error) {
        console.error("Server Error in /sync:", error);
        res.status(500).send('Server Error');
    }
});

// --- تم تعديل هذا المسار بالكامل لدعم العرض المجدول والترقيم ---
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) === 0 ? 0 : (parseInt(req.query.limit) || 50);

        const queryConditions = {}; // يمكن إضافة فلاتر هنا مستقبلاً
        
        const totalNotebooks = await Notebook.countDocuments(queryConditions);

        const aggregationPipeline = [
            { $match: queryConditions },
            { $sort: { startNumber: -1 } },
            {
                $project: {
                    _id: 1,
                    startNumber: 1,
                    endNumber: 1,
                    collectorName: 1,
                    status: 1,
                    minUsedInNotebook: 1,
                    maxUsedInNotebook: 1,
                    missingCount: { $size: { "$ifNull": ["$missingReceipts", []] } },
                    pendingCount: { $size: { "$ifNull": ["$pendingReceipts", []] } },
                }
            },
            {
                $addFields: {
                    availableCount: {
                        $subtract: [
                            { $add: [{ $subtract: ["$maxUsedInNotebook", "$minUsedInNotebook"] }, 1] },
                            "$missingCount"
                        ]
                    }
                }
            }
        ];

        if (limit !== 0) {
            aggregationPipeline.push({ $skip: (page - 1) * limit });
            aggregationPipeline.push({ $limit: limit });
        }

        const notebooks = await Notebook.aggregate(aggregationPipeline);

        notebooks.forEach((notebook, index) => {
            notebook.notebookNumber = totalNotebooks - (((page - 1) * limit) + index);
        });

        res.json({
            notebooks,
            currentPage: page,
            totalPages: limit === 0 ? 1 : Math.ceil(totalNotebooks / limit),
            totalNotebooks
        });

    } catch (error) {
        console.error("Error fetching notebooks summary:", error);
        res.status(500).send('Server Error');
    }
});
// --- نهاية التعديل ---

// --- مسار جديد لجلب تفاصيل دفتر واحد (لعرض البطاقة) ---
router.get('/:id/details', async (req, res) => {
    try {
        const notebook = await Notebook.findById(req.params.id)
                                        .populate({ 
                                            path: 'collectorId', 
                                            select: 'name collectorCode' 
                                        });

        if (!notebook) {
            return res.status(404).json({ message: 'الدفتر غير موجود' });
        }
        
        const usedReceipts = await Receipt.find({
            collector: notebook.collectorId, 
            receiptNumber: { $gte: notebook.startNumber, $lte: notebook.endNumber }
        }).select('receiptNumber');

        res.json({
            ...notebook.toObject(),
            usedReceipts: usedReceipts
        });
        
    } catch (error) {
        console.error("Error fetching notebook details:", error);
        res.status(500).send('Server Error');
    }
});

// --- المسارات التالية تبقى كما هي ---
router.put('/missing/:notebookId/:receiptNumber', async (req, res) => {
    const { status, notes } = req.body;
    try {
        const notebook = await Notebook.findById(req.params.notebookId);
        if (!notebook) return res.status(404).json({ msg: 'الدفتر غير موجود' });
        const missingReceipt = notebook.missingReceipts.find(r => r.receiptNumber == req.params.receiptNumber);
        if (!missingReceipt) return res.status(404).json({ msg: 'السند المفقود غير موجود' });
        missingReceipt.status = status;
        missingReceipt.notes = notes;
        await notebook.save();
        res.json(notebook);
    } catch (error) { res.status(500).send('Server Error'); }
});

// @route   GET api/notebooks/find-receipt/:receiptNumber
router.get('/find-receipt/:receiptNumber', async (req, res) => {
    try {
        const receiptNumber = parseInt(req.params.receiptNumber, 10);
        if (isNaN(receiptNumber)) {
            return res.status(400).json({ msg: 'رقم السند غير صالح' });
        }

        const existingReceipt = await Receipt.findOne({ receiptNumber })
            .populate('subscriber', 'name')
            .populate('collector', 'name');
        
        const startNumber = Math.floor((receiptNumber - 1) / 50) * 50 + 1;
        let notebookSummary = null;
        let searchResult = {};

        // --- تم تعديل هذا الجزء بالكامل ليكون أذكى ويجلب اسم المحصل دائمًا ---
        let notebook;
        if (existingReceipt) {
            // إذا وجدنا السند، نبحث عن دفتره المحدد
            notebook = await Notebook.findOne({ 
                startNumber: startNumber, 
                collectorId: existingReceipt.collector._id 
            });
        } else {
            // إذا لم نجد السند، نبحث في كل الدفاتر عن هذا الرقم المفقود
            notebook = await Notebook.findOne({
                startNumber: startNumber,
                $or: [
                    { 'missingReceipts.receiptNumber': receiptNumber },
                    { 'pendingReceipts': receiptNumber }
                ]
            });
        }

        // إذا وجدنا الدفتر بأي من الطريقتين، نقوم ببناء الملخص الكامل
        if (notebook) {
            // نجلب اسم المحصل بشكل منفصل لضمان وجوده دائمًا
            const collector = await Collector.findById(notebook.collectorId).select('name').lean();
            
            const missingCount = notebook.missingReceipts?.length || 0;
            const pendingCount = notebook.pendingReceipts?.length || 0;
            const availableCount = notebook.minUsedInNotebook ? (notebook.maxUsedInNotebook - notebook.minUsedInNotebook + 1) - missingCount : 0;
            
            notebookSummary = {
                _id: notebook._id,
                startNumber: notebook.startNumber,
                endNumber: notebook.endNumber,
                collectorName: collector?.name || notebook.collectorName, // <-- الإصلاح الأهم
                availableCount: availableCount,
                missingCount: missingCount,
                pendingCount: pendingCount,
                status: notebook.status,
            };
        }

        // بناء النتيجة النهائية بناءً على ما وجدناه
        if (existingReceipt) {
            searchResult = { status: 'مستخدم', receipt: existingReceipt, notebookSummary };
        } else if (notebook) {
            const missingInfo = notebook.missingReceipts.find(r => r.receiptNumber === receiptNumber);
            const isPending = notebook.pendingReceipts.includes(receiptNumber);
            if (missingInfo) {
                searchResult = { status: 'مفقود', receipt: { ...missingInfo.toObject() }, notebookSummary };
            } else if (isPending) {
                searchResult = { status: 'قيد الانتظار', receipt: { receiptNumber, status: 'قيد الانتظار' }, notebookSummary };
            }
        } else {
             searchResult = { status: 'غير موجود', receipt: { receiptNumber }, notebookSummary: null };
        }

        res.json(searchResult);

    } catch (error) {
        console.error("Error in find-receipt:", error);
        res.status(500).send('Server Error');
    }
});


module.exports = router;