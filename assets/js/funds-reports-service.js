// --- ملف خدمة تقارير الصناديق (Funds Reports Service) ---
const API_URL = 'http://localhost:3000/api/funds-reports';

/**
 * --- جلب بيانات التقرير السنوي للصناديق ---
 * @param {object} filters - فلاتر التقرير { year, fundId }
 * @returns {Promise<Object>} - بيانات التقرير
 */
export async function generateAnnualReportForFund(filters) {
    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportType: 'annual-summary', filters }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في توليد التقرير السنوي للصناديق.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating annual fund report:", error);
        throw error;
    }
}