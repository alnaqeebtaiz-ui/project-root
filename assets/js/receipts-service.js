// --- ملف خدمة السندات (Receipts Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات السندات.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api'; // تم تعديل هذا ليصبح الرابط الأساسي فقط
const RECEIPTS_API_URL = `${API_BASE_URL}/receipts`; // رابط API الخاص بالسندات
const COLLECTORS_API_URL = `${API_BASE_URL}/collectors`; // رابط API للمحصلين (للاستخدام في الـ HTML)
const COLLECTORS_SEARCH_API_URL = `${RECEIPTS_API_URL}/search-collectors`; // رابط API للبحث عن المحصلين
// ملاحظة: لقد وضعنا مسار البحث عن المحصلين ضمن receipts router في الخلفية، لذا نستخدم RECEIPTS_API_URL
const SUBSCRIBERS_SEARCH_API_URL = `${RECEIPTS_API_URL}/search-subscribers`; // رابط API للبحث عن المشتركين
// ملاحظة: لقد وضعنا مسار البحث عن المشتركين ضمن receipts router في الخلفية، لذا نستخدم RECEIPTS_API_URL

// دالة مساعدة لجلب التوكن من localStorage
const getAuthToken = () => localStorage.getItem('jwtToken'); // نستخدم 'jwtToken'

// دالة مساعدة لإنشاء الهيدرات (Headers) مع التوكن
const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        // يمكنك هنا إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لم يكن هناك توكن
        // تأكد من أن هذا المسار صحيح
        window.location.href = '/login.html'; 
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token // إضافة التوكن هنا
    };
};

/**
 * جلب جميع السندات من الخادم مع دعم ترقيم الصفحات والبحث.
 * @param {number} [page=1] - رقم الصفحة الحالي.
 * @param {number} [limit=50] - عدد العناصر في الصفحة الواحدة.
 * @param {object} [filters={}] - كائن يحتوي على فلاتر البحث (مثل startDate, endDate, collectorId, startReceipt, endReceipt).
 * @returns {Promise<object>} - كائن يحتوي على مصفوفة من السندات ومعلومات التصفح.
 */
export async function getReceipts(page = 1, limit = 50, filters = {}) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const params = new URLSearchParams({ page, limit, ...filters }); // بناء معلمات URL
        const url = `${RECEIPTS_API_URL}?${params.toString()}`;

        const response = await fetch(url, { headers }); // تمرير الهيدرات

        if (!response.ok) {
            const errorData = await response.json(); // محاولة قراءة رسالة الخطأ من الخادم
            throw new Error(errorData.msg || 'فشل في جلب بيانات السندات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching receipts:", error);
        throw error; // إعادة رمي الخطأ ليتم التعامل معه في الواجهة الأمامية
    }
}

/**
 * جلب جميع المحصلين من الخادم.
 * @returns {Promise<Array>} - مصفوفة من المحصلين.
 */
export async function getCollectors() {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(COLLECTORS_API_URL, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب بيانات المحصلين من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collectors:", error);
        throw error;
    }
}

/**
 * إضافة سند جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} receiptData - بيانات السند الجديد.
 * @returns {Promise<object>}
 */
export async function addReceipt(receiptData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(RECEIPTS_API_URL, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(receiptData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية إضافة السند.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding receipt:", error);
        throw error;
    }
}

/**
 * تحديث بيانات سند موجود.
 * @param {string} receiptId - معرف السند المراد تحديثه.
 * @param {object} updatedData - البيانات الجديدة.
 */
export async function updateReceipt(receiptId, updatedData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${RECEIPTS_API_URL}/${receiptId}`, {
            method: 'PATCH',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية تحديث السند.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating receipt:", error);
        throw error;
    }
}

/**
 * حذف سند من قاعدة البيانات.
 * @param {string} receiptId - معرف السند المراد حذفه.
 */
export async function deleteReceipt(receiptId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${RECEIPTS_API_URL}/${receiptId}`, {
            method: 'DELETE',
            headers: headers // تمرير الهيدرات مع التوكن
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية حذف السند.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting receipt:", error);
        throw error;
    }
}

/**
 * إضافة كشف تحصيل كامل دفعة واحدة عبر الخادم.
 * @param {Array<Object>} receipts - مصفوفة من كائنات السندات.
 * @returns {Promise<object>}
 */


/**
 * البحث عن المحصلين بناءً على نص البحث.
 * @param {string} query - نص البحث عن المحصل.
 * @returns {Promise<Array>} - مصفوفة من كائنات المحصلين المطابقة.
 */
export async function searchCollectors(query) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const params = new URLSearchParams({ query }); // بناء معلمات URL (query=...)
        const url = `${COLLECTORS_SEARCH_API_URL}?${params.toString()}`;

        const response = await fetch(url, { headers }); // تمرير الهيدرات

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في البحث عن المحصلين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching collectors:", error);
        throw error;
    }
}

/**
 * البحث عن المشتركين بناءً على نص البحث.
 * @param {string} query - نص البحث عن المشترك.
 * @returns {Promise<Array>} - مصفوفة من كائنات المشتركين المطابقة.
 */
export async function searchSubscribers(query) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const params = new URLSearchParams({ query }); // بناء معلمات URL (query=...)
        const url = `${SUBSCRIBERS_SEARCH_API_URL}?${params.toString()}`;

        const response = await fetch(url, { headers }); // تمرير الهيدرات

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
export async function batchAddReceipts(receipts) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${RECEIPTS_API_URL}/batch`, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(receipts)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية استيراد الكشف.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error batch adding receipts:", error);
        throw error;
    }
}