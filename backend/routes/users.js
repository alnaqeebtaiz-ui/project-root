const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // قد لا نحتاجه هنا للمصادقة ولكن قد نحتاجه لإنشاء توكن جديد إذا تم تغيير كلمة المرور للمستخدم الحالي أو شيء من هذا القبيل، ولكن الأفضل في الـ auth route
const mongoose = require('mongoose'); // لاستخدام ObjectId للتحقق
const User = require('../models/User'); // تأكد من أنك قمت بإنشاء موديل User في ../models/User.js

// 💡💡💡 سطر جديد تمت إضافته هنا: لاستيراد دوال الحماية 💡💡💡
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// 💡💡💡 تطبيق الحماية على جميع المسارات في هذا الملف 💡💡💡
// إدارة المستخدمين هي وظيفة حصرية للمسؤولين (Admins)
router.use(authenticateToken); 
router.use(authorizeRoles('admin')); 

// @route   GET /api/users
// @desc    جلب جميع المستخدمين
// @access  خاص (للمسؤولين فقط)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // لا ترسل كلمة المرور أبدًا
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/:id
// @desc    جلب مستخدم واحد حسب المعرف
// @access  خاص (للمسؤولين فقط)
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'معرف مستخدم غير صالح.' });
        }
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود.' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching single user:', error);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users
// @desc    إنشاء مستخدم جديد
// @access  خاص (للمسؤولين فقط)
router.post('/', async (req, res) => {
    const { username, email, password, role } = req.body;

    // التحقق الأساسي من المدخلات
    if (!username || !email || !password || !role) {
        return res.status(400).json({ msg: 'يرجى إدخال جميع الحقول المطلوبة.' });
    }

    try {
        // التحقق مما إذا كان المستخدم موجودًا بالفعل بالبريد الإلكتروني أو اسم المستخدم
        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).json({ msg: 'البريد الإلكتروني مستخدم بالفعل.' });
        }
        let userByUsername = await User.findOne({ username });
        if (userByUsername) {
            return res.status(400).json({ msg: 'اسم المستخدم مستخدم بالفعل.' });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إنشاء مستخدم جديد
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();

        // إرجاع المستخدم الجديد بدون كلمة المرور
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({ msg: 'تم إنشاء المستخدم بنجاح.', user: userResponse });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id
// @desc    تحديث معلومات المستخدم (الاسم، البريد الإلكتروني، الدور)
// @access  خاص (للمسؤولين فقط)
router.put('/:id', async (req, res) => {
    const { username, email, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'معرف مستخدم غير صالح.' });
    }

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود.' });
        }

        // التحقق من تكرار البريد الإلكتروني أو اسم المستخدم إذا تم تغييرهما
        if (email && email !== user.email) {
            const existingUserWithEmail = await User.findOne({ email });
            if (existingUserWithEmail && existingUserWithEmail._id.toString() !== req.params.id) {
                return res.status(400).json({ msg: 'البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر.' });
            }
        }
        if (username && username !== user.username) {
            const existingUserWithUsername = await User.findOne({ username });
            if (existingUserWithUsername && existingUserWithUsername._id.toString() !== req.params.id) {
                return res.status(400).json({ msg: 'اسم المستخدم مستخدم بالفعل من قبل مستخدم آخر.' });
            }
        }

        // تحديث الحقول
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password; // لا ترسل كلمة المرور

        res.json({ msg: 'تم تحديث معلومات المستخدم بنجاح.', user: userResponse });

    } catch (error) {
        console.error('Error updating user info:', error);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id/password
// @desc    تغيير كلمة مرور مستخدم محدد
// @access  خاص (للمسؤولين فقط)
router.put('/:id/password', async (req, res) => {
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'معرف مستخدم غير صالح.' });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ msg: 'يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف.' });
    }

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود.' });
        }

        // تشفير كلمة المرور الجديدة
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ msg: 'تم تغيير كلمة مرور المستخدم بنجاح.' });

    } catch (error) {
        console.error('Error changing user password:', error);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/users/:id
// @desc    حذف مستخدم
// @access  خاص (للمسؤولين فقط)
router.delete('/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'معرف مستخدم غير صالح.' });
    }

    try {
        // تأكد من عدم حذف المستخدم المسؤول عن نفسه إذا كان هو الوحيد
        if (req.user.id === req.params.id) {
            const adminUsersCount = await User.countDocuments({ role: 'admin' });
            if (adminUsersCount <= 1) { // لا تسمح بحذف آخر مسؤول
                return res.status(403).json({ msg: 'لا يمكن حذف حساب المسؤول الأخير في النظام.' });
            }
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود.' });
        }

        await User.deleteOne({ _id: req.params.id });

        res.json({ msg: 'تم حذف المستخدم بنجاح.' });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id/status (اختياري)
// @desc    تغيير حالة تفعيل المستخدم (تفعيل/تعطيل)
// @access  خاص (للمسؤولين فقط)
router.put('/:id/status', async (req, res) => {
    const { isActive } = req.body; // يجب أن تكون قيمة منطقية (true/false)

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'معرف مستخدم غير صالح.' });
    }

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ msg: 'قيمة isActive غير صالحة.' });
    }

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود.' });
        }

        // لا تسمح بتعطيل آخر مسؤول
        if (!isActive && user.role === 'admin' && req.user.id === req.params.id) {
            const adminUsersCount = await User.countDocuments({ role: 'admin' });
            if (adminUsersCount <= 1) {
                return res.status(403).json({ msg: 'لا يمكن تعطيل حساب المسؤول الأخير في النظام.' });
            }
        }

        user.isActive = isActive;
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password; 

        res.json({ msg: `تم ${isActive ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح.`, user: userResponse });

    } catch (error) {
        console.error('Error changing user status:', error);
        res.status(500).send('Server Error');
    }
});


module.exports = router;