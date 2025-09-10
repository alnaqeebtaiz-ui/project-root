// استيراد مكتبة Mongoose
const mongoose = require('mongoose');
const { Schema } = mongoose;

// تعريف "هيكل" أو "شكل" بيانات الصندوق
const fundSchema = new Schema({
    // اسم الصندوق
    name: {
        type: String,
        required: [true, 'حقل اسم الصندوق مطلوب.'],
        trim: true,
    },
    // كود أو رقم الصندوق (يجب أن يكون فريدًا)
    fundCode: {
        type: String,
        required: [true, 'حقل كود الصندوق مطلوب.'],
        unique: true,
        trim: true,
    },
    // وصف الصندوق (اختياري)
    description: {
        type: String,
        trim: true,
    },
    // تاريخ إنشاء السجل في النظام
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// --- إضافة حقل افتراضي (Virtual) لعرض المحصلين المرتبطين ---
// هذا الحقل لا يتم تخزينه في قاعدة البيانات، بل يتم حسابه عند الطلب
fundSchema.virtual('collectors', {
    ref: 'Collector', // اذهب إلى مودل "Collector"
    localField: '_id',    // ابحث عن قيمة _id الخاصة بهذا الصندوق...
    foreignField: 'fund'  // ...وطابقها مع قيمة حقل "fund" في مودل المحصل
});

// --- تفعيل عرض الحقول الافتراضية عند تحويل المستند إلى JSON ---
// بدون هذين السطرين، لن تظهر الحقول الافتراضية في النتائج
fundSchema.set('toJSON', { virtuals: true });
fundSchema.set('toObject', { virtuals: true });


// إنشاء وتصدير النموذج
module.exports = mongoose.model('Fund', fundSchema);

