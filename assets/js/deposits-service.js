// --- ملف خدمة التوريد (Deposits Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات سجلات التوريد.

// تعريف الرابط الأساسي للخادم الخلفي
const API_URL = 'http://localhost:3000/api/deposits';

/**
 * جلب جميع سجلات التوريد من الخادم.
 * @returns {Promise<Array>} - مصفوفة من سجلات التوريد.
 */
export async function getDeposits() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('فشل في جلب بيانات التوريد من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching deposits:", error);
        return [];
    }
}

/**
 * إضافة سجل توريد جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} depositData - بيانات التوريد الجديد.
 * @returns {Promise<object>}
 */
export async function addDeposit(depositData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        const response = await fetch(`${API_URL}/${depositId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
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
        const response = await fetch(`${API_URL}/${depositId}`, {
            method: 'DELETE'
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
