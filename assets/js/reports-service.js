// D:\project-root\assets\js\reports-service.js
// --- ملف خدمة التقارير (Reports Service) ---
// يحتوي على دوال التعامل مع الخادم الخلفي لتوليد التقارير.

const API_URL = 'https://alnaqeeb.onrender.com/api/reports';

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
 * إرسال طلب لتوليد تقرير بناءً على النوع والفلاتر المحددة.
 * @param {string} reportType - نوع التقرير (مثال: 'detailed-periodic').
 * @param {object} filters - كائن يحتوي على الفلاتر (مثال: { startDate, endDate, collectorIds }).
 * @returns {Promise<Array>} - مصفوفة من صفوف بيانات التقرير.
 */
export async function generateReport(reportType, filters) {
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
            throw new Error(errorData.msg || 'فشل في توليد التقرير من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating report:", error);
        throw error; // أعد رمي الخطأ ليتم التعامل معه في الواجهة
    }
}

/**
 * --- دالة جديدة: جلب بيانات التقرير السنوي ---
 * @param {object} filters - فلاتر التقرير { year, collectorId }
 * @returns {Promise<Object>} - بيانات التقرير المقسمة شهريًا مع الإجماليات
 */
export async function generateAnnualReport(filters) {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: headers, // 👈 استخدم الرؤوس مع التوكن
            // نرسل نوع تقرير جديد ليتعرف عليه الخادم
            body: JSON.stringify({ reportType: 'annual-summary', filters }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في توليد التقرير السنوي.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating annual report:", error);
        throw error;
    }
}

// 💡💡💡 إضافة دالة لجلب المحصلين مع المصادقة 💡💡💡
// هذه الدالة ستكون ضرورية لـ initializePage
export async function getCollectors() {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا
        const response = await fetch('https://alnaqeeb.onrender.com/api/collectors', { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب قائمة المحصلين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collectors:", error);
        throw error;
    }
}