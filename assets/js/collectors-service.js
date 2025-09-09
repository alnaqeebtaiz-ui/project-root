// --- ملف خدمة المحصلين (Collectors Service) ---
// يحتوي هذا الملف على جميع الدوال الخاصة بالتعامل مع الخادم الخلفي (Backend)
// لجلب وإدارة بيانات المحصلين.

// تعريف الرابط الأساسي للخادم الخلفي
const API_URL = 'http://localhost:3000/api/collectors';

/**
 * جلب جميع المحصلين من الخادم.
 * @returns {Promise<Array>} - مصفوفة من المحصلين.
 */
export async function getCollectors() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('فشل في جلب البيانات من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collectors:", error);
        return [];
    }
}

/**
 * إضافة محصل جديد عبر إرسال البيانات إلى الخادم.
 * @param {object} collectorData - بيانات المحصل الجديد.
 * @returns {Promise<object>} - بيانات المحصل الجديد كما تم حفظها في قاعدة البيانات.
 */
export async function addCollector(collectorData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(collectorData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية إضافة المحصل.');
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
        const response = await fetch(`${API_URL}/${collectorId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('فشل في جلب بيانات المحصل.');
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
        const response = await fetch(`${API_URL}/${collectorId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية تحديث المحصل.');
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
        const response = await fetch(`${API_URL}/${collectorId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشلت عملية حذف المحصل.');
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
        // نستخدم encodeURIComponent لضمان أن مصطلح البحث آمن للإرسال في الرابط
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('فشل في البحث عن المحصلين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching collectors:", error);
        return [];
    }
}
// --- الإضافة الجديدة تنتهي هنا ---