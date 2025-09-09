const mongoose = require('mongoose');

const MissingReceiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: Number,
        required: true
    },
    estimatedDate: {
        type: Date,
        default: null
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
        // --- تم التصحيح هنا ---
        ref: 'Collector', 
        default: null
    },
    collectorName: {
        type: String,
        default: 'غير محدد'
    },
    startNumber: {
        type: Number,
        required: true
        // unique: true // من الأفضل إزالة unique من هنا إذا كان يمكن لنفس الدفتر أن يتكرر مع محصلين مختلفين
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

// --- وتم التصحيح هنا أيضًا ---
module.exports = mongoose.model('Notebook', NotebookSchema);