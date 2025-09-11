// --- ملف خدمة الصناديق (Funds Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات الصناديق.

// تعريف الرابط الأساسي للخادم الخلفي
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api'; // تم تعديل هذا ليصبح الرابط الأساسي فقط
const FUNDS_API_URL = `${API_BASE_URL}/funds`; // رابط API الخاص بالصناديق

// دالة مساعدة لجلب التوكن من localStorage
const getAuthToken = () => localStorage.getItem('jwtToken'); // نستخدم 'jwtToken' كما اكتشفناه سابقًا

// دالة مساعدة لإنشاء الهيدرات (Headers) مع التوكن
const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        // يمكنك هنا إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لم يكن هناك توكن
        // أو رمي خطأ ليتم التعامل معه في الواجهة الأمامية
        window.location.href = '/login.html'; // 💡💡💡 عدّل هذا المسار إذا كانت صفحة تسجيل الدخول مختلفة 💡💡💡
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token // إضافة التوكن هنا
    };
};

/**
 * جلب جميع الصناديق مع أرصدتها من الخادم.
 * @returns {Promise<Array>} - مصفوفة من الصناديق.
 */
export async function getFunds() {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(FUNDS_API_URL, { headers }); // تمرير الهيدرات
        
        if (!response.ok) {
            const errorData = await response.json(); // محاولة قراءة رسالة الخطأ من الخادم
            throw new Error(errorData.msg || 'فشل في جلب بيانات الصناديق من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching funds:", error);
        throw error; // إعادة رمي الخطأ ليتم التعامل معه في الواجهة الأمامية (funds.html)
    }
}

/**
 * إضافة صندوق جديد مع المحصلين المرتبطين به.
 * @param {object} fundData - بيانات الصندوق الجديد (name, fundCode, collectors).
 * @returns {Promise<object>}
 */
export async function addFund(fundData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(FUNDS_API_URL, {
            method: 'POST',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(fundData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية إضافة الصندوق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding fund:", error);
        throw error;
    }
}

/**
 * تحديث بيانات صندوق موجود وارتباطاته.
 * @param {string} fundId - معرف الصندوق المراد تحديثه.
 * @param {object} updatedData - البيانات الجديدة.
 */
export async function updateFund(fundId, updatedData) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${FUNDS_API_URL}/${fundId}`, {
            method: 'PATCH',
            headers: headers, // تمرير الهيدرات مع التوكن ونوع المحتوى
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية تحديث الصندوق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating fund:", error);
        throw error;
    }
}

/**
 * حذف صندوق من قاعدة البيانات.
 * @param {string} fundId - معرف الصندوق المراد حذفه.
 */
export async function deleteFund(fundId) {
    try {
        const headers = getAuthHeaders(); // جلب الهيدرات مع التوكن
        const response = await fetch(`${FUNDS_API_URL}/${fundId}`, {
            method: 'DELETE',
            headers: headers // تمرير الهيدرات مع التوكن
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشلت عملية حذف الصندوق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting fund:", error);
        throw error;
    }
}