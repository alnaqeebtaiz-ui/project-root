// استيراد مكتبة Mongoose للتعامل مع MongoDB
const mongoose = require('mongoose');

// تعريف "هيكل" أو "شكل" بيانات المحصل
const collectorSchema = new mongoose.Schema({
    // حقل كود المحصل
    collectorCode: {
        type: String, // نوع البيانات: نص
        required: true, // هذا الحقل إجباري
        unique: true, // يجب أن يكون هذا الكود فريدًا ولا يتكرر
        trim: true // لإزالة أي مسافات فارغة
    },
    // حقل اسم المحصل
    name: {
        type: String,
        required: true,
        trim: true
    },
    // حقل الرصيد الافتتاحي
    openingBalance: {
        type: Number, // نوع البيانات: رقم
        required: true,
        default: 0 // القيمة الافتراضية هي صفر
    },
    // حقل تاريخ الإنشاء
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// إنشاء وتصدير النموذج بناءً على الهيكل الذي عرفناه
module.exports = mongoose.model('Collector', collectorSchema);
