// --- ملف خدمة الصناديق (Funds Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات الصناديق.

// تعريف الرابط الأساسي للخادم الخلفي
const API_URL = 'http://localhost:3000/api/funds';

/**
 * جلب جميع الصناديق مع أرصدتها من الخادم.
 * @returns {Promise<Array>} - مصفوفة من الصناديق.
 */
export async function getFunds() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('فشل في جلب بيانات الصناديق من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching funds:", error);
        return [];
    }
}

/**
 * إضافة صندوق جديد مع المحصلين المرتبطين به.
 * @param {object} fundData - بيانات الصندوق الجديد (name, fundCode, collectors).
 * @returns {Promise<object>}
 */
export async function addFund(fundData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fundData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية إضافة الصندوق.');
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
        const response = await fetch(`${API_URL}/${fundId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية تحديث الصندوق.');
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
        const response = await fetch(`${API_URL}/${fundId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية حذف الصندوق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting fund:", error);
        throw error;
    }
}
