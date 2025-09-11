// D:\project-root\assets\js\funds-reports-service.js
// --- ملف خدمة تقارير الصناديق (Funds Reports Service) ---
// يحتوي على دوال التعامل مع الخادم الخلفي لتوليد تقارير الصناديق (المحصلين).

const API_URL = 'https://alnaqeeb.onrender.com/api/funds-reports';

// 💡💡💡 إضافة دوال جلب التوكن و رؤوس الطلب 💡💡💡
const getAuthToken = () => localStorage.getItem('jwtToken');

const getAuthHeaders = (contentType = 'application/json') => {
    const token = getAuthToken();
    if (!token) {
        // يمكن إعادة التوجيه لصفحة تسجيل الدخول إذا لم يتوفر التوكن
        window.location.href = '/login.html';
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    const headers = {
        'x-auth-token': token // إضافة التوكن هنا
    };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
};


/**
 * إرسال طلب لتوليد تقرير صندوق بناءً على النوع والفلاتر المحددة.
 * @param {string} reportType - نوع التقرير ('periodic' أو 'annual').
 * @param {object} filters - كائن يحتوي على الفلاتر (مثال: { year, month, cycle }).
 * @returns {Promise<object|Array>} - بيانات التقرير العائدة من الخادم.
 */
export async function generateFundReport(reportType, filters) {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: headers, // 👈 استخدم الرؤوس مع التوكن
            body: JSON.stringify({ reportType, filters }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في توليد تقرير الصندوق من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating fund report:", error);
        throw error; // أعد رمي الخطأ ليتم التعامل معه في الواجهة
    }
}

// 💡💡💡 إضافة دالة لجلب الصناديق مع المصادقة 💡💡💡
export async function getFunds() {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا
        const response = await fetch('https://alnaqeeb.onrender.com/api/funds', { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب قائمة الصناديق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching funds:", error);
        throw error;
    }
}