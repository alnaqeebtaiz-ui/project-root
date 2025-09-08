// --- ملف خدمة المشتركين (Subscribers Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات المشتركين.

// تعريف الرابط الأساسي للخادم الخلفي
const API_URL = 'http://localhost:3000/api/subscribers';

/**
 * جلب جميع المشتركين من الخادم.
 * @returns {Promise<Array>} - مصفوفة من المشتركين.
 */
export async function getSubscribers() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('فشل في جلب البيانات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        return [];
    }
}

/**
 * إضافة مشترك جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} subscriberData - بيانات المشترك الجديد.
 * @returns {Promise<object>} - بيانات المشترك الجديد كما تم حفظها في قاعدة البيانات.
 */
export async function addSubscriber(subscriberData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscriberData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية إضافة المشترك.');
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
        const response = await fetch(`${API_URL}/${subscriberId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('فشل في جلب بيانات المشترك.');
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
        const response = await fetch(`${API_URL}/${subscriberId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية تحديث المشترك.');
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
        const response = await fetch(`${API_URL}/${subscriberId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية حذف المشترك.');
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
        const response = await fetch(`${API_URL}/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscribers)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية استيراد الدفعة.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error batch adding subscribers:", error);
        throw error;
    }
}

