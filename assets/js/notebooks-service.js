// --- ملف خدمة الدفاتر (Notebooks Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات الدفاتر.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api'; // الرابط الأساسي
const NOTEBOOKS_API_URL = `${API_BASE_URL}/notebooks`; // رابط API الخاص بالدفاتر

// دالة مساعدة لجلب التوكن من localStorage
const getAuthToken = () => localStorage.getItem('jwtToken');

// دالة مساعدة لإنشاء الهيدرات (Headers) مع التوكن
const getAuthHeaders = (contentType = 'application/json') => {
    const token = getAuthToken();
    if (!token) {
        // يمكنك هنا إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لم يكن هناك توكن
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
 * جلب صفحة محددة من ملخصات الدفاتر.
 * @param {number} page - رقم الصفحة.
 * @param {number} limit - عدد العناصر في الصفحة.
 * @returns {Promise<Object>}
 */
export async function getNotebooksPaged(page, limit) {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج لـ 'Content-Type' في طلب GET
        const response = await fetch(`${NOTEBOOKS_API_URL}?page=${page}&limit=${limit}`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل تحميل الدفاتر من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching paged notebooks:", error);
        throw error;
    }
}

/**
 * تجلب كل التفاصيل الخاصة بدفتر معين لعرضها في بطاقة.
 * @param {string} notebookId - الـ ID الخاص بالدفتر.
 * @returns {Promise<Object>}
 */
export async function getNotebookDetails(notebookId) {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج لـ 'Content-Type' في طلب GET
        const response = await fetch(`${NOTEBOOKS_API_URL}/${notebookId}/details`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل تحميل تفاصيل الدفتر.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching notebook details for ID ${notebookId}:`, error);
        throw error;
    }
}

/**
 * جلب جميع الدفاتر من الخادم.
 * @returns {Promise<Array>}
 */
export async function getNotebooks() {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج لـ 'Content-Type' في طلب GET
        const response = await fetch(NOTEBOOKS_API_URL, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل تحميل الدفاتر.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching all notebooks:", error);
        throw error;
    }
}

/**
 * إرسال طلب مزامنة الدفاتر إلى الخادم.
 * @returns {Promise<object>}
 */
export async function syncNotebooks() {
    try {
        const headers = getAuthHeaders(); // نحتاج لـ 'Content-Type' هنا لـ POST
        const response = await fetch(`${NOTEBOOKS_API_URL}/sync`, { 
            method: 'POST',
            headers: headers // تمرير الهيدرات
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في المزامنة.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error syncing notebooks:", error);
        throw error;
    }
}

/**
 * تحديث حالة وملاحظات سند مفقود.
 * @param {string} notebookId - معرف الدفتر.
 * @param {number} receiptNumber - رقم السند المفقود.
 * @param {object} data - البيانات الجديدة { status, notes }.
 * @returns {Promise<object>}
*/
export async function updateMissingReceipt(notebookId, receiptNumber, data) {
    try {
        const headers = getAuthHeaders(); // نحتاج لـ 'Content-Type' هنا لـ PUT
        const response = await fetch(`${NOTEBOOKS_API_URL}/missing/${notebookId}/${receiptNumber}`, {
            method: 'PUT',
            headers: headers, // تمرير الهيدرات
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في حفظ التغييرات.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating missing receipt:", error);
        throw error;
    }
}

/**
 * البحث عن تفاصيل سند معين.
 * @param {number} receiptNumber - رقم السند للبحث عنه.
 * @returns {Promise<object>} - تفاصيل السند ودفتره.
 */
export async function findReceiptDetails(receiptNumber) {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج لـ 'Content-Type' في طلب GET
        const response = await fetch(`${NOTEBOOKS_API_URL}/find-receipt/${receiptNumber}`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'حدث خطأ أثناء البحث.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error finding receipt details:", error);
        throw error;
    }
}