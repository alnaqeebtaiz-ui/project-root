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

// إنشاء وتصدير النموذج
module.exports = mongoose.model('Fund', fundSchema);

