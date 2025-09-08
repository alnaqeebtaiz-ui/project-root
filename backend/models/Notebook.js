const mongoose = require('mongoose');

const MissingReceiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['مفقود', 'ملغي', 'تالف', 'خطأ إدخال'],
        default: 'مفقود'
    },
    notes: {
        type: String,
        default: ''
    }
});

const NotebookSchema = new mongoose.Schema({
    collectorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'collector',
        default: null
    },
    collectorName: {
        type: String,
        default: 'غير محدد'
    },
    startNumber: {
        type: Number,
        required: true,
        unique: true
    },
    endNumber: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['قيد الاستخدام', 'مكتمل', 'مرجع'],
        default: 'قيد الاستخدام'
    },
    missingReceipts: [MissingReceiptSchema],
    pendingReceipts: [{
        type: Number
    }],

    // --- إضافة جديدة: لتحديد النطاق الفعلي المستخدم داخل الدفتر ---
    minUsedInNotebook: {
        type: Number,
        default: null
    },
    maxUsedInNotebook: {
        type: Number,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('notebook', NotebookSchema);

