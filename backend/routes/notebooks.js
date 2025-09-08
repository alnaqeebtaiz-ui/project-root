const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Notebook = require('../models/Notebook');

// --- مسار المزامنة (النسخة النهائية) ---
router.post('/sync', async (req, res) => {
    try {
        const allReceipts = await Receipt.find();
        if (allReceipts.length === 0) {
            return res.json({ message: 'لا توجد سندات للمزامنة' });
        }

        const receiptsByCollector = new Map();
        for (const receipt of allReceipts) {
            const collectorId = receipt.collectorId ? receipt.collectorId.toString() : 'unassigned';
            if (!receiptsByCollector.has(collectorId)) {
                receiptsByCollector.set(collectorId, []);
            }
            receiptsByCollector.get(collectorId).push(receipt);
        }

        await Notebook.deleteMany({}); // نبدأ من جديد لضمان عدم وجود بيانات قديمة خاطئة

        for (const [collectorId, collectorReceipts] of receiptsByCollector.entries()) {
            const collectorName = collectorReceipts[0]?.collectorName || 'غير محدد';
            const allCollectorNumbers = collectorReceipts.map(r => r.receiptNumber);
            const existingNumbers = new Set(allCollectorNumbers);

            if (allCollectorNumbers.length === 0) continue;

            const minReceiptForCollector = Math.min(...allCollectorNumbers);
            const maxReceiptForCollector = Math.max(...allCollectorNumbers);
            const firstNotebookStart = Math.floor((minReceiptForCollector - 1) / 50) * 50 + 1;

            for (let start = firstNotebookStart; start <= maxReceiptForCollector; start += 50) {
                const end = start + 49;
                
                // --- حساب النطاق الفعلي المستخدم داخل هذا الدفتر فقط ---
                const usedInNotebook = allCollectorNumbers.filter(n => n >= start && n <= end);
                if (usedInNotebook.length === 0) continue; // نتجاهل الدفاتر الفارغة

                const minUsed = Math.min(...usedInNotebook);
                const maxUsed = Math.max(...usedInNotebook);
                
                const missingInThisNotebook = [];
                const pendingInThisNotebook = [];

                for (let j = start; j <= end; j++) {
                    if (existingNumbers.has(j)) continue; // هذا السند مستخدم

                    if (j > minUsed && j < maxUsed) {
                        missingInThisNotebook.push({ receiptNumber: j, status: 'مفقود' });
                    } else if (j > maxUsed) {
                        pendingInThisNotebook.push(j);
                    }
                }

                const notebookData = {
                    startNumber: start, endNumber: end,
                    collectorId: collectorId !== 'unassigned' ? collectorId : null,
                    collectorName: collectorName,
                    missingReceipts: missingInThisNotebook,
                    pendingReceipts: pendingInThisNotebook,
                    minUsedInNotebook: minUsed, // <-- حفظ النطاق الفعلي
                    maxUsedInNotebook: maxUsed, // <-- حفظ النطاق الفعلي
                    status: (pendingInThisNotebook.length === 0 && missingInThisNotebook.length === 0) ? 'مكتمل' : 'قيد الاستخدام'
                };
                await Notebook.findOneAndUpdate({ startNumber: start }, notebookData, { upsert: true, new: true });
            }
        }
        res.json({ message: 'تمت المزامنة بالمنطق النهائي بنجاح' });
    } catch (error) {
        console.error("Server Error in /sync:", error);
        res.status(500).send('Server Error');
    }
});

// --- بقية المسارات تبقى كما هي تمامًا ---
router.get('/', async (req, res) => {
    try {
        const notebooks = await Notebook.find().sort({ startNumber: -1 });
        res.json(notebooks);
    } catch (error) { res.status(500).send('Server Error'); }
});
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
        if (isNaN(receiptNumber)) return res.status(400).json({ msg: 'رقم السند غير صالح' });
        const existingReceipt = await Receipt.findOne({ receiptNumber }).populate('subscriber', 'name').populate('collector', 'name');
        if (existingReceipt) {
            return res.json({ status: 'مستخدم', receipt: existingReceipt, notebook: { startNumber: Math.floor((receiptNumber - 1) / 50) * 50 + 1, endNumber: Math.floor((receiptNumber - 1) / 50) * 50 + 50, collectorName: existingReceipt.collector?.name || 'غير محدد' } });
        }
        const startNumber = Math.floor((receiptNumber - 1) / 50) * 50 + 1;
        const notebook = await Notebook.findOne({ startNumber });
        if (notebook) {
            const missingInfo = notebook.missingReceipts.find(r => r.receiptNumber === receiptNumber);
            const isPending = notebook.pendingReceipts.includes(receiptNumber);
            if (missingInfo) {
                return res.json({ status: 'مفقود', receipt: { receiptNumber: receiptNumber, status: missingInfo.status, notes: missingInfo.notes }, notebook: { startNumber: notebook.startNumber, endNumber: notebook.endNumber, collectorName: notebook.collectorName } });
            } else if (isPending) {
                return res.json({ status: 'قيد الانتظار', receipt: { receiptNumber: receiptNumber, status: 'قيد الانتظار' }, notebook: { startNumber: notebook.startNumber, endNumber: notebook.endNumber, collectorName: notebook.collectorName } });
            }
        }
        res.json({ status: 'غير موجود', receipt: { receiptNumber }, notebook: null });
    } catch (error) { res.status(500).send('Server Error'); }
});

module.exports = router;

