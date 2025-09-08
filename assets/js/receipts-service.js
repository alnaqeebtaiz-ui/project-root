// --- ملف خدمة السندات (Receipts Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات السندات.

// تعريف الرابط الأساسي للخادم الخلفي
const API_URL = 'http://localhost:3000/api/receipts';

/**
 * جلب جميع السندات من الخادم.
 * @returns {Promise<Array>} - مصفوفة من السندات.
 */
export async function getReceipts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('فشل في جلب بيانات السندات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching receipts:", error);
        return [];
    }
}

/**
 * إضافة سند جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} receiptData - بيانات السند الجديد.
 * @returns {Promise<object>}
 */
export async function addReceipt(receiptData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API_URL}/${receiptId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API_URL}/${receiptId}`, {
            method: 'DELETE'
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
export async function batchAddReceipts(receipts) {
    try {
        const response = await fetch(`${API_URL}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

