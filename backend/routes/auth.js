const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // لاستخدام bcrypt لتجزئة كلمات المرور
const jwt = require('jsonwebtoken'); // لاستخدام JWT لإنشاء الرموز
const User = require('../models/User'); // استيراد نموذج المستخدم

// لضمان تحميل متغيرات البيئة من ملف .env
require('dotenv').config();

// @route   POST api/auth/register
// @desc    تسجيل مستخدم جديد (متاح للمدير فقط في البداية)
// @access  Public (ولكن يجب أن يُستخدم بحذر، أو تُحمى لاحقًا بـ Admin middleware)
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجودًا بالفعل
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'اسم المستخدم هذا موجود بالفعل.' });
        }

        // إنشاء مستخدم جديد
        user = new User({
            username,
            email,
            password, // ستُجزأ قبل الحفظ
            role: role || 'collector' // إذا لم يتم تحديد الدور، يكون الافتراضي 'collector'
        });

        // تجزئة كلمة المرور
        const salt = await bcrypt.genSalt(10); // توليد "ملح" (salt) لزيادة الأمان
        user.password = await bcrypt.hash(password, salt); // تجزئة كلمة المرور مع الملح

        await user.save(); // حفظ المستخدم في قاعدة البيانات

        // إنشاء رمز JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // مفتاح سري لتوقيع الرمز (يجب أن يكون في .env)
            { expiresIn: '1h' }, // صلاحية الرمز لساعة واحدة
            (err, token) => {
                if (err) throw err;
                res.json({ token, msg: 'تم تسجيل المستخدم بنجاح!' });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/login
// @desc    تسجيل دخول المستخدم والحصول على الرمز المميز (JWT)
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجودًا
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'بيانات اعتماد غير صالحة.' });
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'بيانات اعتماد غير صالحة.' });
        }

        // إنشاء رمز JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // مفتاح سري لتوقيع الرمز
            { expiresIn: '1h' }, // صلاحية الرمز لساعة واحدة
            (err, token) => {
                if (err) throw err;
                res.json({ token, msg: 'تم تسجيل الدخول بنجاح!' });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;