const mongoose = require('mongoose');

const MissingReceiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['مفقود', 'ملغي', 'تالف', 'خطأ إدخال'], // الحالات الممكنة
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
        ref: 'collector', // يربط الدفتر بالمحصل
        default: null
    },
    collectorName: { // لتسهيل العرض
        type: String,
        default: 'غير محدد'
    },
    startNumber: {
        type: Number,
        required: true,
        unique: true // كل دفتر يبدأ برقم فريد
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
    missingReceipts: [MissingReceiptSchema] // مصفوفة لتخزين السندات المفقودة
}, {
    timestamps: true // لإضافة تاريخ الإنشاء والتحديث تلقائيًا
});

module.exports = mongoose.model('notebook', NotebookSchema);