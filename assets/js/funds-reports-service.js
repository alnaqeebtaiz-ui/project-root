// --- ملف خدمة تقارير الصناديق (Funds Reports Service) ---
// يحتوي على دوال التعامل مع الخادم الخلفي لتوليد تقارير الصناديق (المحصلين).

const API_URL = 'http://localhost:3000/api/funds-reports';

/**
 * إرسال طلب لتوليد تقرير صندوق بناءً على النوع والفلاتر المحددة.
 * @param {string} reportType - نوع التقرير ('periodic' أو 'annual').
 * @param {object} filters - كائن يحتوي على الفلاتر (مثال: { year, month, cycle }).
 * @returns {Promise<object|Array>} - بيانات التقرير العائدة من الخادم.
 */
export async function generateFundReport(reportType, filters) {
    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reportType, filters }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في توليد تقرير الصندوق من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating fund report:", error);
        throw error; // أعد رمي الخطأ ليتم التعامل معه في الواجهة
    }
}
