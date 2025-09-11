// --- ملف خدمة المشتركين (Subscribers Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات المشتركين.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'http://localhost:3000/api'; // تم تعديل هذا ليصبح الرابط الأساسي فقط
const SUBSCRIBERS_API_URL = `${API_BASE_URL}/subscribers`; // رابط API الخاص بالمشتركين

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
 * جلب جميع المشتركين من الخادم مع دعم ترقيم الصفحات والبحث.
 * @param {number} [page=1] - رقم الصفحة الحالي.
 * @param {number} [limit=50] - عدد العناصر في الصفحة الواحدة.
 * @param {string} [search=''] - مصطلح البحث.
 * @returns {Promise<object>} - كائن يحتوي على مصفوفة من المشتركين ومعلومات التصفح.
 */
export async function getSubscribers(page = 1, limit = 50, search = '') { // 👈 تم تعديل المعلمات الافتراضية هنا
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        // بناء رابط الـ API مع معلمات ترقيم الصفحات والبحث
        const url = `${SUBSCRIBERS_API_URL}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
        const response = await fetch(url, { headers }); // تمرير الهيدرات

        if (!response.ok) {
            const errorData = await response.json(); // محاولة قراءة رسالة الخطأ من الخادم
            throw new Error(errorData.msg || 'فشل في جلب البيانات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        throw error; // إعادة رمي الخطأ ليتم التعامل معه في الواجهة الأمامية
    }
}

/**
 * إضافة مشترك جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} subscriberData - بيانات المشترك الجديد.
 * @returns {Promise<object>} - بيانات المشترك الجديد كما تم حفظها في قاعدة البيانات.
*/
export async function addSubscriber(subscriberData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(SUBSCRIBERS_API_URL, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(subscriberData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية إضافة المشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding subscriber:", error);
        throw error;
    }
}

/**
 * جلب بيانات مشترك واحد بواسطة المعرف (ID).
 * @param {string} subscriberId - معرف المشترك.
 * @returns {Promise<object|null>}
*/
export async function getSubscriberById(subscriberId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${SUBSCRIBERS_API_URL}/${subscriberId}`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            if (response.status === 404) return null;
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب بيانات المشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching subscriber by ID:", error);
        throw error;
    }
}

/**
 * تحديث بيانات مشترك موجود.
 * @param {string} subscriberId - معرف المشترك المراد تحديثه.
 * @param {object} updatedData - البيانات الجديدة.
*/
export async function updateSubscriber(subscriberId, updatedData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${SUBSCRIBERS_API_URL}/${subscriberId}`, {
            method: 'PATCH',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية تحديث المشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating subscriber:", error);
        throw error;
    }
}

/**
 * حذف مشترك من قاعدة البيانات.
 * @param {string} subscriberId - معرف المشترك المراد حذفه.
*/
export async function deleteSubscriber(subscriberId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${SUBSCRIBERS_API_URL}/${subscriberId}`, {
            method: 'DELETE',
            headers: headers // تمرير الهيدرات مع التوكن
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية حذف المشترك.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting subscriber:", error);
        throw error;
    }
}

/**
 * إضافة مجموعة من المشتركين دفعة واحدة عبر الخادم.
 * @param {Array<Object>} subscribers - مصفوفة من كائنات المشتركين.
*/
export async function batchAddSubscribers(subscribers) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${SUBSCRIBERS_API_URL}/batch`, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(subscribers)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية استيراد الدفعة.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error batch adding subscribers:", error);
        throw error;
    }
}