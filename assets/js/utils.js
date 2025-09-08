/**
 * utils.js
 * يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في جميع أنحاء التطبيق.
 * يتم تصدير كل دالة بشكل منفصل لاستخدامها مع وحدات ES Modules.
 */

// ==================================
//       وظائف عرض الواجهة
// ==================================

/**
 * إظهار رسالة تنبيه (Toast) للمستخدم.
 * هذه الدالة تعتمد على وجود عنصر <div id="toast"> في ملف الـ HTML.
 * @param {string} message - الرسالة المراد عرضها.
 * @param {string} type - نوع الرسالة ('success' أو 'error' أو 'warning').
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) {
        console.error("Toast element not found in the DOM.");
        return;
    }

    // إعادة تعيين الكلاسات وتحديد لون الرسالة
    toast.className = 'toast-notification'; // Reset classes
    toast.classList.add(type); // 'success', 'error', or 'warning'

    toastMessage.textContent = message;

    // إظهار الرسالة
    toast.classList.add('show');
    
    // إخفاء الرسالة بعد 3 ثوانٍ
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


// ==================================
//       وظائف تنسيق البيانات
// ==================================

/**
 * تحويل كائن تاريخ Timestamp من Firebase إلى صيغة 'YYYY-MM-DD'.
 * @param {object} firebaseTimestamp - كائن التاريخ القادم من Firestore.
 * @returns {string} التاريخ المنسق أو سلسلة فارغة.
 */
export function formatFirebaseDate(firebaseTimestamp) {
    if (!firebaseTimestamp || typeof firebaseTimestamp.toDate !== 'function') return '';
    
    const date = firebaseTimestamp.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * تنسيق الأرقام مع فواصل الآلاف (باستخدام الأرقام الإنجليزية).
 * @param {number} number - الرقم المراد تنسيقه.
 * @returns {string} الرقم المنسق.
 */
export function formatNumber(number) {
    if (typeof number !== 'number') return '0';
    // --- التعديل هنا: تم تغيير 'ar-SA' إلى 'en-US' لعرض الأرقام الإنجليزية ---
    return number.toLocaleString('en-US');
}

/**
 * تنسيق الأرقام كعملة.
 * @param {number} amount - المبلغ.
 * @param {string} currency - العملة (اختياري).
 * @returns {string} المبلغ المنسق مع العملة.
 */
export function formatCurrency(amount, currency = 'ريال') {
    if (typeof amount !== 'number') return `0 ${currency}`;
    return `${formatNumber(amount)} ${currency}`;
}


// ==================================
//       وظائف التحقق من الصحة
// ==================================

/**
 * التحقق من صحة البريد الإلكتروني.
 * @param {string} email - البريد الإلكتروني للتحقق منه.
 * @returns {boolean}
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * التحقق من أن الحقل ليس فارغًا.
 * @param {*} value - القيمة المراد التحقق منها.
 * @returns {boolean}
 */
export function validateRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
}

/**
 * إزالة أي أكواد HTML ضارة من المدخلات النصية.
 * @param {string} input - النص المدخل.
 * @returns {string} النص الآمن.
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}

console.log("Utility functions module loaded.");

