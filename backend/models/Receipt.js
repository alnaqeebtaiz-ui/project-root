// استيراد مكتبة Mongoose
const mongoose = require('mongoose');
const { Schema } = mongoose;

// تعريف "هيكل" أو "شكل" بيانات السند
const receiptSchema = new Schema({
    // رقم السند
    receiptNumber: {
        type: Number,
        required: true,
    },
    // المبلغ المحصّل
    amount: {
        type: Number,
        required: true,
    },
    // تاريخ التحصيل
    date: {
        type: Date,
        required: true,
    },
    // حالة السند (نشط، ملغي، تالف، إلخ)
    status: {
        type: String,
        required: true,
        enum: ['active', 'cancelled', 'damaged', 'error'], // القيم المسموح بها فقط
        default: 'active', // القيمة الافتراضية
    },
    // --- الربط مع المجموعات الأخرى ---
    // ربط السند بالمحصل الذي قام بتحصيله
    collector: {
        type: Schema.Types.ObjectId, // نوع البيانات هو معرّف كائن من MongoDB
        ref: 'Collector', // يشير إلى أن هذا المعرّف يعود إلى كائن في مجموعة "Collector"
        required: true,
    },
    // ربط السند بالمشترك الذي دفع المبلغ
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber', // يشير إلى مجموعة "Subscriber"
        required: true,
    },
    // تاريخ إنشاء السجل في النظام
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// إنشاء وتصدير النموذج بناءً على الهيكل الذي عرفناه
module.exports = mongoose.model('Receipt', receiptSchema);
