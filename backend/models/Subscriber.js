// استيراد مكتبة Mongoose للتعامل مع MongoDB
const mongoose = require('mongoose');

// تعريف "هيكل" أو "شكل" بيانات المشترك
// هذا يخبر قاعدة البيانات ما هي الحقول التي يجب أن يحتوي عليها كل "مشترك"
const subscriberSchema = new mongoose.Schema({
    // حقل اسم المشترك
    name: {
        type: String, // نوع البيانات: نص
        required: true, // هذا الحقل إجباري
        trim: true // لإزالة أي مسافات فارغة في البداية أو النهاية
    },
    // حقل العنوان
    address: {
        type: String,
        required: true,
        trim: true
    },
    // حقل رقم الهاتف
    phone: {
        type: String,
        trim: true,
        // (يمكن إضافة تحقق من صحة الرقم لاحقًا إذا أردنا)
    }
    // --- تم حذف حقل تاريخ التسجيل من هنا ---
});

// إنشاء وتصدير النموذج بناءً على الهيكل الذي عرفناه
// الآن يمكننا استخدام "Subscriber" في أي مكان في الخادم للتعامل مع المشتركين
module.exports = mongoose.model('Subscriber', subscriberSchema);