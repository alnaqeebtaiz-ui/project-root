// --- ملف خدمة التوريد (Deposits Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات سجلات التوريد.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api'; // الرابط الأساسي
const DEPOSITS_API_URL = `${API_BASE_URL}/deposits`; // رابط API الخاص بالتوريدات
// لا نحتاج لرابط COLLECTORS هنا، حيث أن getCollectors ستأتي من ملفها الخاص

// دالة مساعدة لجلب التوكن من localStorage
const getAuthToken = () => localStorage.getItem('jwtToken');

// دالة مساعدة لإنشاء الهيدرات (Headers) مع التوكن
const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        // يمكنك هنا إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لم يكن هناك توكن
        window.location.href = '/login.html'; 
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token // إضافة التوكن هنا
    };
};

/**
 * جلب جميع سجلات التوريد من الخادم مع دعم ترقيم الصفحات والبحث.
 * @param {number} [page=1] - رقم الصفحة الحالي.
 * @param {number} [limit=50] - عدد العناصر في الصفحة الواحدة. (limit=0 لـ "جلب الكل")
 * @param {object} [filters={}] - كائن يحتوي على فلاتر البحث (مثل startDate, endDate, collectorId).
 * @returns {Promise<object>} - كائن يحتوي على مصفوفة من سجلات التوريد ومعلومات التصفح.
 */
export async function getDeposits(page = 1, limit = 50, filters = {}) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const params = new URLSearchParams({ page, limit, ...filters }); // بناء معلمات URL
        const url = `${DEPOSITS_API_URL}?${params.toString()}`;

        const response = await fetch(url, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب بيانات التوريد من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching deposits:", error);
        throw error;
    }
}

/**
 * جلب سجل توريد واحد بواسطة معرفه (ID).
 * @param {string} depositId - معرف سجل التوريد.
 * @returns {Promise<object>} - كائن سجل التوريد.
 */
export async function getDepositById(depositId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${DEPOSITS_API_URL}/${depositId}`, { headers }); // تمرير الهيدرات

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب سجل التوريد بالمعرف المحدد.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching deposit by ID ${depositId}:`, error);
        throw error;
    }
}

/**
 * إضافة سجل توريد جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} depositData - بيانات التوريد الجديد.
 * @returns {Promise<object>}
 */
export async function addDeposit(depositData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(DEPOSITS_API_URL, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(depositData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية إضافة سجل التوريد.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding deposit:", error);
        throw error;
    }
}

/**
 * تحديث بيانات سجل توريد موجود.
 * @param {string} depositId - معرف السجل المراد تحديثه.
 * @param {object} updatedData - البيانات الجديدة.
 */
export async function updateDeposit(depositId, updatedData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${DEPOSITS_API_URL}/${depositId}`, {
            method: 'PATCH',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية تحديث السجل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating deposit:", error);
        throw error;
    }
}

/**
 * حذف سجل توريد من قاعدة البيانات.
 * @param {string} depositId - معرف السجل المراد حذفه.
 */
export async function deleteDeposit(depositId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${DEPOSITS_API_URL}/${depositId}`, {
            method: 'DELETE',
            headers: headers // تمرير الهيدرات مع التوكن
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية حذف السجل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting deposit:", error);
        throw error;
    }
}