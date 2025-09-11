const jwt = require('jsonwebtoken');

// تأكد من تحميل متغيرات البيئة
require('dotenv').config();

// Middleware للتحقق من رمز JWT
function authenticateToken(req, res, next) {
    // احصل على الرمز من رأس Authorization
    const token = req.header('x-auth-token'); // تعديل: جلب التوكن من x-auth-token مباشرة

    if (!token) {
        // إذا لم يتم العثور على رمز، فهو غير مصرح له
        return res.status(401).json({ msg: 'لا يوجد رمز، غير مصرح له.' });
    }

    try {
        // التحقق من الرمز باستخدام المفتاح السري
        // إذا كان الرمز صالحًا، سيتم فك تشفيره وإضافة الـ payload إلى req.user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // قم بتخزين معلومات المستخدم (id و role) في كائن الطلب
        next(); // انتقل إلى الـ middleware أو المسار التالي
    } catch (err) {
        // إذا كان الرمز غير صالح (منتهي الصلاحية، خاطئ، إلخ)
        console.error('JWT Verification Error:', err.message);
        return res.status(403).json({ msg: 'الرمز غير صالح.' });
    }
}

// Middleware للتحقق من الدور
function authorizeRoles(...roles) {
    return (req, res, next) => {
        // تأكد أن المستخدم قد تم مصادقته وأن لديه دوراً
        if (!req.user || !req.user.role) {
            return res.status(401).json({ msg: 'غير مصرح له، لا يوجد معلومات عن الدور.' });
        }
        // التحقق مما إذا كان دور المستخدم موجودًا في قائمة الأدوار المسموح بها
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'ليس لديك الصلاحيات اللازمة للقيام بهذا الإجراء.' });
        }
        next(); // إذا كان الدور مسموحًا به، انتقل
    };
}

module.exports = { authenticateToken, authorizeRoles };