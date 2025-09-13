// استيراد المكتبات الأساسية
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // لتفعيل قراءة ملف .env

// --- استيراد ملفات المسارات (Routes) ---
const subscribersRouter = require('./routes/subscribers');
const collectorsRouter = require('./routes/collectors');
const receiptsRouter = require('./routes/receipts');
const depositsRouter = require('./routes/deposits');
const notebooks = require('./routes/notebooks');
const reportsRouter = require('./routes/reports');
const fundsRouter = require('./routes/funds');
const fundsReportsRouter = require('./routes/funds-reports');
const subReportsRouter = require('./routes/sub-reports');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const reportRoutes = require('./routes/note-reports');

// إنشاء تطبيق Express
const app = express();

// --- Middleware ---

// CORS setup (مهم جداً للتواصل بين الـ frontend والـ backend)
// هذا يسمح لـ Netlify بالوصول إلى هذا الـ backend
app.use(cors({
    origin: 'https://alnaqeebtaiz-ui.github.io', // <--- هذا هو رابط Netlify الصحيح
    // تم إضافة 'PATCH' إلى قائمة الأساليب المسموح بها هنا
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // <--- التعديل تم هنا
    allowedHeaders: ['Content-Type', 'x-auth-token'] // مهم: السماح برأس x-auth-token للمصادقة
}));

// زيادة الحد الأقصى لحجم الطلبات ومعالجة JSON و URL-encoded data
// يجب أن تأتي هذه بعد CORS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// --- استخدام المسارات ---
// ربط المسارات بالروابط الخاصة بها
app.use('/api/subscribers', subscribersRouter);
app.use('/api/collectors', collectorsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/deposits', depositsRouter);
app.use('/api/notebooks', notebooks);
app.use('/api/reports', reportsRouter);
app.use('/api/funds', fundsRouter);
app.use('/api/funds-reports', fundsReportsRouter);
app.use('/api/sub-reports', subReportsRouter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/note-reports', reportRoutes);



// --- الاتصال بقاعدة البيانات ---
// استخدام MONGO_URI الذي قمنا بتعيينه في Render
const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error('خطأ: رابط قاعدة البيانات MONGO_URI غير موجود في البيئة.');
    process.exit(1);
}

mongoose.connect(dbURI)
    .then(() => {
        console.log('تم الاتصال بقاعدة بيانات MongoDB Atlas بنجاح!');

        const PORT = process.env.PORT || 5000;

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