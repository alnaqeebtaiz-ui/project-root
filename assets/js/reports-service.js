// --- ملف خدمة التقارير (Reports Service) ---
// يحتوي على دوال التعامل مع الخادم الخلفي لتوليد التقارير.

const API_URL = 'http://localhost:3000/api/reports';

/**
 * إرسال طلب لتوليد تقرير بناءً على النوع والفلاتر المحددة.
 * @param {string} reportType - نوع التقرير (مثال: 'detailed-periodic').
 * @param {object} filters - كائن يحتوي على الفلاتر (مثال: { startDate, endDate, collectorIds }).
 * @returns {Promise<Array>} - مصفوفة من صفوف بيانات التقرير.
 */
export async function generateReport(reportType, filters) {
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
            throw new Error(errorData.msg || 'فشل في توليد التقرير من الخادم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating report:", error);
        throw error; // أعد رمي الخطأ ليتم التعامل معه في الواجهة
    }
}

/**
 * --- دالة جديدة: جلب بيانات التقرير السنوي ---
 * @param {object} filters - فلاتر التقرير { year, collectorId }
 * @returns {Promise<Object>} - بيانات التقرير المقسمة شهريًا مع الإجماليات
 */
export async function generateAnnualReport(filters) {
    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // نرسل نوع تقرير جديد ليتعرف عليه الخادم
            body: JSON.stringify({ reportType: 'annual-summary', filters }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في توليد التقرير السنوي.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating annual report:", error);
        throw error;
    }
}
