// D:\project-root\assets\js\sub-reports-service.js
// --- ملف خدمة تقارير المشتركين (Subscribers Reports Service) ---
const API_URL = 'http://localhost:3000/api'; // URL الأساسي للخادم

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
 * --- جلب آخر سداد لكل المشتركين ---
 * يتصل بـ /api/sub-reports/latest-payments
 * @returns {Promise<Array>} - مصفوفة من كائنات { subscriberName, latestPaymentDate, latestPaymentAmount }
 */
export async function getLatestPaymentsForAllSubscribers() {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا
        const response = await fetch(`${API_URL}/sub-reports/latest-payments`, { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب آخر سداد للمشتركين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching latest payments:", error);
        throw error;
    }
}

/**
 * --- جلب كشف حساب لمشترك محدد ---
 * يتصل بـ /api/sub-reports/statement
 * @param {string} subscriberId - ID المشترك المطلوب
 * @param {string} startDate - تاريخ البداية (اختياري)
 * @param {string} endDate - تاريخ النهاية (اختياري)
 * @returns {Promise<Object>} - كائن يحتوي على { subscriberName, statement: [], totalAmount }
 */
export async function getSubscriberStatement(subscriberId, startDate, endDate) {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/sub-reports/statement`, {
            method: 'POST',
            headers: headers, // 👈 استخدم الرؤوس مع التوكن
            body: JSON.stringify({ subscriberId, startDate, endDate }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب كشف حساب المشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching statement for subscriber ${subscriberId}:`, error);
        throw error;
    }
}

/**
 * --- جلب اقتراحات المشتركين للبحث الذكي ---
 * يتصل بـ /api/subscribers/search
 * @param {string} query - نص البحث (اسم أو رقم هاتف)
 * @returns {Promise<Array>} - مصفوفة من كائنات المشتركين { _id, name, phone }
 */
export async function searchSubscribers(query) {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا
        const response = await fetch(`${API_URL}/subscribers/search?q=${encodeURIComponent(query)}`, { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في البحث عن المشتركين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching subscribers:", error);
        throw error;
    }
}
/**
 * --- جلب آخر سداد لمشترك واحد ---
 * يتصل بـ /api/sub-reports/latest-payment/:subscriberId
 * @param {string} subscriberId - ID المشترك المطلوب
 * @returns {Promise<Object>} - كائن يحتوي على { subscriberName, latestPayment: { amount, date, receiptNumber, notes } }
 */
export async function getLatestPaymentForSingleSubscriber(subscriberId) {
    try {
        // 💡💡💡 استخدام getAuthHeaders 💡💡💡
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا
        const response = await fetch(`${API_URL}/sub-reports/latest-payment/${subscriberId}`, { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب آخر سداد للمشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching latest payment for single subscriber ${subscriberId}:`, error);
        throw error;
    }
}