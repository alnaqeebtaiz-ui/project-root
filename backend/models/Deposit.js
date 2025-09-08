// استيراد مكتبة Mongoose
const mongoose = require('mongoose');
const { Schema } = mongoose;

// تعريف "هيكل" أو "شكل" بيانات التوريد
const depositSchema = new Schema({
    // المبلغ المورّد
    amount: {
        type: Number,
        required: [true, 'حقل المبلغ مطلوب.'],
    },
    // تاريخ التوريد
    depositDate: {
        type: Date,
        required: [true, 'حقل التاريخ مطلوب.'],
    },
    // رقم سند التوريد (اختياري)
    referenceNumber: {
        type: String,
        trim: true,
    },
    // --- الربط مع المحصل ---
    collector: {
        type: Schema.Types.ObjectId,
        ref: 'Collector',
        required: true,
    },
    // تاريخ إنشاء السجل في النظام
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// إنشاء وتصدير النموذج
module.exports = mongoose.model('Deposit', depositSchema);
