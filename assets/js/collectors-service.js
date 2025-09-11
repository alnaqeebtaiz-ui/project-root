// --- ملف خدمة المحصلين (Collectors Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات المحصلين.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'http://localhost:3000/api'; // تم تعديل هذا ليصبح الرابط الأساسي فقط
const COLLECTORS_API_URL = `${API_BASE_URL}/collectors`; // رابط API الخاص بالمحصلين

// دالة مساعدة لجلب التوكن من localStorage
const getAuthToken = () => localStorage.getItem('jwtToken'); // نستخدم 'jwtToken'

// دالة مساعدة لإنشاء الهيدرات (Headers) مع التوكن
const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        // يمكنك هنا إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لم يكن هناك توكن
        window.location.href = '/login.html'; // 💡💡💡 عدّل هذا المسار إذا كانت صفحة تسجيل الدخول مختلفة 💡💡💡
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token // إضافة التوكن هنا
    };
};

/**
 * جلب جميع المحصلين من الخادم.
 * @returns {Promise<Array>} - مصفوفة من المحصلين.
 */
export async function getCollectors() {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(COLLECTORS_API_URL, { headers }); // تمرير الهيدرات
        
        if (!response.ok) {
            const errorData = await response.json(); // محاولة قراءة رسالة الخطأ من الخادم
            throw new Error(errorData.msg || 'فشل في جلب البيانات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collectors:", error);
        throw error; // إعادة رمي الخطأ ليتم التعامل معه في الواجهة الأمامية (funds.html)
    }
}

/**
 * إضافة محصل جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} collectorData - بيانات المحصل الجديد.
 * @returns {Promise<object>} - بيانات المحصل الجديد كما تم حفظها في قاعدة البيانات.
 */
export async function addCollector(collectorData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(COLLECTORS_API_URL, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(collectorData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية إضافة المحصل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding collector:", error);
        throw error;
    }
}

/**
 * جلب بيانات محصل واحد بواسطة المعرف (ID).
 * @param {string} collectorId - معرف المحصل.
 * @returns {Promise<object|null>}
 */
export async function getCollectorById(collectorId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${COLLECTORS_API_URL}/${collectorId}`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            if (response.status === 404) return null;
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب بيانات المحصل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collector by ID:", error);
        throw error;
    }
}

/**
 * تحديث بيانات محصل موجود.
 * @param {string} collectorId - معرف المحصل المراد تحديثه.
 * @param {object} updatedData - البيانات الجديدة.
 */
export async function updateCollector(collectorId, updatedData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${COLLECTORS_API_URL}/${collectorId}`, {
            method: 'PATCH',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية تحديث المحصل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating collector:", error);
        throw error;
    }
}

/**
 * حذف محصل من قاعدة البيانات.
 * @param {string} collectorId - معرف المحصل المراد حذفه.
 */
export async function deleteCollector(collectorId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${COLLECTORS_API_URL}/${collectorId}`, {
            method: 'DELETE',
            headers: headers // تمرير الهيدرات مع التوكن
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية حذف المحصل.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting collector:", error);
        throw error;
    }
}

// --- الإضافة الجديدة والمهمة تبدأ هنا ---
/**
 * البحث عن محصلين بالاسم أو الكود.
 * @param {string} query - مصطلح البحث.
 * @returns {Promise<Array>} - مصفوفة من المحصلين المطابقين.
 */
export async function searchCollectors(query) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        // نستخدم encodeURIComponent لضمان أن مصطلح البحث آمن للإرسال في الرابط
        const response = await fetch(`${COLLECTORS_API_URL}/search?q=${encodeURIComponent(query)}`, { headers }); // تمرير الهيدرات
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في البحث عن المحصلين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching collectors:", error);
        throw error;
    }
}
// --- الإضافة الجديدة تنتهي هنا ---