// استيراد المكتبات الأساسية
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // لتفعيل قراءة ملف .env

// --- استيراد ملفات المسارات (Routes) ---
const subscribersRouter = require('./routes/subscribers');
const collectorsRouter = require('./routes/collectors');
const receiptsRouter = require('./routes/receipts');
const depositsRouter = require('./routes/deposits'); // --- إضافة جديدة: استيراد مسارات التوريد
const notebooks = require('./routes/notebooks');
const reportsRouter = require('./routes/reports');
const fundsRouter = require('./routes/funds');

// إنشاء تطبيق Express
const app = express();

// استخدام middleware للسماح بالطلبات من واجهات مختلفة (CORS)
app.use(cors());

// --- زيادة الحد الأقصى لحجم الطلبات ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// --- استخدام المسارات ---
// ربط المسارات بالروابط الخاصة بها
app.use('/api/subscribers', subscribersRouter);
app.use('/api/collectors', collectorsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/deposits', depositsRouter); // --- إضافة جديدة: استخدام مسارات التوريد
app.use('/api/notebooks', notebooks); // <-- وأضف هذا السطر
app.use('/api/reports', reportsRouter);
app.use('/api/funds', fundsRouter);



// --- الاتصال بقاعدة البيانات ---
const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
    console.error('خطأ: رابط قاعدة البيانات MONGODB_URI غير موجود في ملف .env');
    process.exit(1);
}

mongoose.connect(dbURI)
    .then(() => {
        console.log('تم الاتصال بقاعدة بيانات MongoDB Atlas بنجاح!');
        
        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('فشل الاتصال بقاعدة البيانات:', err);
    });


// نقطة نهاية (endpoint) تجريبية للصفحة الرئيسية
app.get('/', (req, res) => {
    res.send('<h1>مرحباً بك في خادم إدارة الفواتير!</h1>');
});

