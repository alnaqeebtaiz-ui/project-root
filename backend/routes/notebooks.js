const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Notebook = require('../models/Notebook'); // <-- استيراد المودل الجديد

// @route   POST api/notebooks/sync
// @desc    Analyze receipts and sync with the Notebooks collection
// @access  Public
router.post('/sync', async (req, res) => {
    try {
        const allReceipts = await Receipt.find().sort({ receiptNumber: 1 });
        if (allReceipts.length === 0) {
            return res.json({ message: 'لا توجد سندات للمزامنة' });
        }

        const receiptNumbers = allReceipts.map(r => r.receiptNumber);
        const existingNumbers = new Set(receiptNumbers);
        const minNumber = receiptNumbers[0];
        const maxNumber = receiptNumbers[receiptNumbers.length - 1];
        
        const firstNotebookStart = Math.floor((minNumber - 1) / 50) * 50 + 1;

        for (let start = firstNotebookStart; start <= maxNumber; start += 50) {
            const end = start + 49;
            const missingInNotebook = [];
            
            for (let j = start; j <= end; j++) {
                if (!existingNumbers.has(j) && j < maxNumber) {
                    missingInNotebook.push({ receiptNumber: j });
                }
            }

            // ابحث عن الدفتر، وإذا لم تجده قم بإنشائه
            await Notebook.findOneAndUpdate(
                { startNumber: start },
                {
                    $set: {
                        startNumber: start,
                        endNumber: end,
                        // هنا يتم تحديث السندات المفقودة دون حذف الملاحظات القديمة
                        missingReceipts: missingInNotebook.map(mr => ({
                            receiptNumber: mr.receiptNumber,
                            status: 'مفقود',
                            notes: ''
                        }))
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true } // upsert: true تعني "أنشئ إن لم يكن موجودًا"
            );
        }

        res.json({ message: 'تمت مزامنة الدفاتر بنجاح' });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/notebooks
// @desc    Get all notebooks from the database
// @access  Public
router.get('/', async (req, res) => {
    try {
        // جلب الدفاتر مرتبة من الأحدث إلى الأقدم
        const notebooks = await Notebook.find().sort({ startNumber: -1 });
        res.json(notebooks);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


// @route   PUT api/notebooks/missing/:notebookId/:receiptNumber
// @desc    Update a missing receipt's status and notes
// @access  Public
router.put('/missing/:notebookId/:receiptNumber', async (req, res) => {
    const { status, notes } = req.body;
    
    try {
        const notebook = await Notebook.findById(req.params.notebookId);
        if (!notebook) {
            return res.status(404).json({ msg: 'الدفتر غير موجود' });
        }

        const missingReceipt = notebook.missingReceipts.find(
            r => r.receiptNumber == req.params.receiptNumber
        );

        if (!missingReceipt) {
            return res.status(404).json({ msg: 'السند المفقود غير موجود في هذا الدفتر' });
        }

        // تحديث البيانات
        missingReceipt.status = status;
        missingReceipt.notes = notes;

        await notebook.save();
        res.json(notebook);

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;