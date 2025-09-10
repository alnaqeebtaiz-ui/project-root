// --- ملف خدمة تقارير المشتركين (Subscribers Reports Service) ---
const API_URL = 'http://localhost:3000/api'; // URL الأساسي للخادم

/**
 * --- جلب آخر سداد لكل المشتركين ---
 * يتصل بـ /api/sub-reports/latest-payments
 * @returns {Promise<Array>} - مصفوفة من كائنات { subscriberName, latestPaymentDate, latestPaymentAmount }
 */
export async function getLatestPaymentsForAllSubscribers() {
    try {
        const response = await fetch(`${API_URL}/sub-reports/latest-payments`);
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
        const response = await fetch(`${API_URL}/sub-reports/statement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        // تأكد من استخدام مسار /api/subscribers/search الموجود لديك
        const response = await fetch(`${API_URL}/subscribers/search?q=${encodeURIComponent(query)}`);
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
        const response = await fetch(`${API_URL}/sub-reports/latest-payment/${subscriberId}`);
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