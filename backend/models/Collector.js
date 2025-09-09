// استيراد مكتبة Mongoose للتعامل مع MongoDB
const mongoose = require('mongoose');
const { Schema } = mongoose; // --- هذا هو السطر الذي كان مفقودًا ---

// تعريف "هيكل" أو "شكل" بيانات المحصل
const collectorSchema = new Schema({
    // حقل كود المحصل
    collectorCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // حقل اسم المحصل
    name: {
        type: String,
        required: true,
        trim: true
    },
    // حقل الرصيد الافتتاحي
    openingBalance: {
        type: Number,
        required: true,
        default: 0
    },
    // حقل لربط المحصل بالصندوق الذي يتبعه
    fund: {
        type: Schema.Types.ObjectId, // الآن سيعرف الكود ما هي "Schema"
        ref: 'Fund',
        required: false
    },
    // حقل تاريخ الإنشاء
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// إنشاء وتصدير النموذج بناءً على الهيكل الذي عرفناه
module.exports = mongoose.model('Collector', collectorSchema);

