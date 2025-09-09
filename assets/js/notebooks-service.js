// --- ملف خدمة الدفاتر (Notebooks Service) ---
const API_URL = 'http://localhost:3000/api/notebooks';

/**
 * --- دالة جديدة: جلب الدفاتر مع دعم الترقيم ---
 * تجلب صفحة محددة من ملخصات الدفاتر.
 * @param {number} page - رقم الصفحة.
 * @param {number} limit - عدد العناصر في الصفحة.
 * @returns {Promise<Object>}
 */
export async function getNotebooksPaged(page, limit) {
    const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`);
    if (!response.ok) {
        throw new Error('فشل تحميل الدفاتر من الخادم.');
    }
    return await response.json();
}

/**
 * --- دالة جديدة: جلب تفاصيل دفتر واحد ---
 * تجلب كل التفاصيل الخاصة بدفتر معين لعرضها في بطاقة.
 * @param {string} notebookId - الـ ID الخاص بالدفتر.
 * @returns {Promise<Object>}
 */
export async function getNotebookDetails(notebookId) {
    const response = await fetch(`${API_URL}/${notebookId}/details`);
    if (!response.ok) {
        throw new Error('فشل تحميل تفاصيل الدفتر.');
    }
    return await response.json();
}

/**
 * جلب جميع الدفاتر من الخادم.
 * @returns {Promise<Array>}
 */
export async function getNotebooks() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('فشل تحميل الدفاتر');
    return await response.json();
}

/**
 * إرسال طلب مزامنة الدفاتر إلى الخادم.
 * @returns {Promise<object>}
 */
export async function syncNotebooks() {
    const response = await fetch(`${API_URL}/sync`, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في المزامنة');
    }
    return await response.json();
}

/**
 * تحديث حالة وملاحظات سند مفقود.
 * @param {string} notebookId - معرف الدفتر.
 * @param {number} receiptNumber - رقم السند المفقود.
 * @param {object} data - البيانات الجديدة { status, notes }.
 * @returns {Promise<object>}
 */
export async function updateMissingReceipt(notebookId, receiptNumber, data) {
    const response = await fetch(`${API_URL}/missing/${notebookId}/${receiptNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('فشل في حفظ التغييرات');
    return await response.json();
}

/**
 * البحث عن تفاصيل سند معين.
 * @param {number} receiptNumber - رقم السند للبحث عنه.
 * @returns {Promise<object>} - تفاصيل السند ودفتره.
 */
export async function findReceiptDetails(receiptNumber) {
    const response = await fetch(`${API_URL}/find-receipt/${receiptNumber}`);
    if (!response.ok) throw new Error('حدث خطأ أثناء البحث');
    return await response.json();
}