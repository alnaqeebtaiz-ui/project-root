const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Notebook = require('../models/Notebook');
const mongoose = require('mongoose');
const Collector = require('../models/Collector');

// --- مسار المزامنة (يبقى كما هو حاليًا) ---
// --- تم تعديل هذا المسار بالكامل ليدعم "المزامنة الذكية" ---
router.post('/sync', async (req, res) => {
    try {
        // الخطوة 1: ابحث عن آخر سند تمت معالجته
        const lastSyncedReceipt = await Receipt.findOne().sort({ createdAt: -1 });
        const lastNotebookUpdate = await Notebook.findOne().sort({ updatedAt: -1 });

        let receiptsToProcess;
        // إذا كانت هناك دفاتر تمت مزامنتها من قبل، قم بالمزامنة الذكية
        if (lastNotebookUpdate) {
            // جلب السندات الجديدة + السندات التي حالتها ليست "نشطة" (لإعادة تقييمها)
            receiptsToProcess = await Receipt.find({
                $or: [
                    { createdAt: { $gt: lastNotebookUpdate.updatedAt } },
                    { status: { $ne: 'active' } }
                ]
            }).populate('collector', 'name');
            if (receiptsToProcess.length === 0) {
                return res.json({ message: 'لا توجد سندات جديدة أو محدثة للمزامنة.' });
            }
        } else {
            // المزامنة الكاملة لأول مرة فقط
            receiptsToProcess = await Receipt.find().populate('collector', 'name');
            if (receiptsToProcess.length === 0) {
                return res.json({ message: 'لا توجد سندات للمزامنة.' });
            }
            await Notebook.deleteMany({}); // تنظيف فقط في حالة المزامنة الكاملة
        }

        // الخطوة 2: تجميع السندات المطلوبة حسب الدفتر والمحصل
        const notebooksToUpdate = new Map();
        for (const receipt of receiptsToProcess) {
            const startNumber = Math.floor((receipt.receiptNumber - 1) / 50) * 50 + 1;
            const collectorId = receipt.collector ? receipt.collector._id.toString() : 'unassigned';
            const key = `${startNumber}_${collectorId}`;

            if (!notebooksToUpdate.has(key)) {
                notebooksToUpdate.set(key, {
                    startNumber: startNumber,
                    endNumber: startNumber + 49,
                    collectorId: collectorId,
                    collectorName: receipt.collector ? receipt.collector.name : 'غير محدد',
                    receipts: new Set()
                });
            }
            notebooksToUpdate.get(key).receipts.add(receipt.receiptNumber);
        }

        // الخطوة 3: تحديث الدفاتر في قاعدة البيانات
        for (const notebookData of notebooksToUpdate.values()) {
            // جلب كل السندات الموجودة فعليًا لهذا الدفتر من قاعدة البيانات
            const allUsedReceiptsInDB = await Receipt.find({
                collector: notebookData.collectorId,
                receiptNumber: { $gte: notebookData.startNumber, $lte: notebookData.endNumber }
            });
            const existingNumbers = new Set(allUsedReceiptsInDB.map(r => r.receiptNumber));
            
            if(existingNumbers.size === 0) continue;

            const minUsed = Math.min(...existingNumbers);
            const maxUsed = Math.max(...existingNumbers);
            const missingInThisNotebook = [];
            const pendingInThisNotebook = [];

            for (let j = notebookData.startNumber; j <= notebookData.endNumber; j++) {
                if (existingNumbers.has(j)) continue;

                if (j > minUsed && j < maxUsed) {
                    missingInThisNotebook.push({ receiptNumber: j, status: 'مفقود' });
                } else if (j > maxUsed) {
                    pendingInThisNotebook.push(j);
                }
            }
            
            const updatePayload = {
                startNumber: notebookData.startNumber,
                endNumber: notebookData.endNumber,
                collectorId: notebookData.collectorId !== 'unassigned' ? notebookData.collectorId : null,
                collectorName: notebookData.collectorName,
                missingReceipts: missingInThisNotebook,
                pendingReceipts: pendingInThisNotebook,
                minUsedInNotebook: minUsed,
                maxUsedInNotebook: maxUsed,
                status: (pendingInThisNotebook.length === 0 && missingInThisNotebook.length === 0 && (maxUsed === notebookData.endNumber || existingNumbers.size === 50)) ? 'مكتمل' : 'قيد الاستخدام'
            };
            
            await Notebook.findOneAndUpdate(
                { startNumber: notebookData.startNumber, collectorId: notebookData.collectorId },
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
// --- نهاية تعديل مسار المزامنة ---

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

router.get('/find-receipt/:receiptNumber', async (req, res) => {
    try {
        const receiptNumber = parseInt(req.params.receiptNumber, 10);
        if (isNaN(receiptNumber)) {
            return res.status(400).json({ msg: 'رقم السند غير صالح' });
        }

        // 1. ابحث عن السند وتفاصيله كالمعتاد
        const existingReceipt = await Receipt.findOne({ receiptNumber })
            .populate('subscriber', 'name')
            .populate('collector', 'name');
        
        const startNumber = Math.floor((receiptNumber - 1) / 50) * 50 + 1;
        let notebookSummary = null;
        let searchResult = {};

        // 2. ابحث عن ملخص الدفتر الذي ينتمي إليه السند
        const collectorIdForNotebook = existingReceipt ? existingReceipt.collector._id : null;
        const notebook = await Notebook.findOne({ startNumber: startNumber, collectorId: collectorIdForNotebook });

        if (notebook) {
            // حساب الملخص
            const missingCount = notebook.missingReceipts?.length || 0;
            const pendingCount = notebook.pendingReceipts?.length || 0;
            const availableCount = (notebook.maxUsedInNotebook - notebook.minUsedInNotebook + 1) - missingCount;
            
            notebookSummary = {
                _id: notebook._id,
                startNumber: notebook.startNumber,
                endNumber: notebook.endNumber,
                availableCount: availableCount,
                missingCount: missingCount,
                pendingCount: pendingCount,
                status: notebook.status,
            };
        }

        // 3. تحديد حالة السند النهائية ودمج النتائج
        if (existingReceipt) {
            searchResult = {
                status: 'مستخدم',
                receipt: existingReceipt,
                notebookSummary: notebookSummary,
            };
        } else if (notebook) {
            const missingInfo = notebook.missingReceipts.find(r => r.receiptNumber === receiptNumber);
            const isPending = notebook.pendingReceipts.includes(receiptNumber);

            if (missingInfo) {
                searchResult = { status: 'مفقود', receipt: { ...missingInfo }, notebookSummary: notebookSummary };
            } else if (isPending) {
                searchResult = { status: 'قيد الانتظار', receipt: { receiptNumber: receiptNumber, status: 'قيد الانتظار' }, notebookSummary: notebookSummary };
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
// --- نهاية تعديل مسار البحث ---


module.exports = router;