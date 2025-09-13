// D:\project-root\assets\js\note-reports-service.js
// --- ملف خدمة تقارير الدفاتر (Note Reports Service) ---
// يحتوي على دوال التعامل مع الخادم الخلفي لتقارير السندات المفقودة.

// تأكد أن هذا هو رابط الـ Backend الخاص بك على Render
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api/note-reports';

// 💡 دوال جلب التوكن ورؤوس الطلب (مماثلة لـ funds-reports-service.js) 💡
const getAuthToken = () => localStorage.getItem('jwtToken'); // ⚠️ تأكد أن هذا هو اسم التوكن الصحيح في localStorage

const getAuthHeaders = (contentType = 'application/json') => {
    const token = getAuthToken();
    if (!token) {
        // يمكن إعادة التوجيه لصفحة تسجيل الدخول إذا لم يتوفر التوكن
        // window.location.href = '/login.html';
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    const headers = {
        'x-auth-token': token // إضافة التوكن هنا
    };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
};

/**
 * جلب قائمة المحصلين من الـ API.
 * @returns {Promise<Array>} - قائمة المحصلين.
 */
export async function getCollectors() {
    try {
        const headers = getAuthHeaders(null); // لا نحتاج Content-Type هنا لطلبات GET
        const response = await fetch(`${API_BASE_URL}/collectors`, { headers });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب قائمة المحصلين.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collectors:", error);
        throw error;
    }
}

/**
 * جلب تقرير السندات المفقودة بناءً على الفلاتر.
 * @param {object} filters - كائن يحتوي على الفلاتر (collectorId, startDate, endDate).
 * @returns {Promise<Array>} - بيانات تقرير السندات المفقودة.
 */
export async function getMissingReceiptsReport(filters) {
    try {
        const headers = getAuthHeaders(null);
        const params = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_BASE_URL}/missing-receipts?${params}`, { headers });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب تقرير السندات المفقودة.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching missing receipts report:", error);
        throw error;
    }
}

/**
 * تصدير بيانات تقرير السندات المفقودة إلى ملف Excel.
 * @param {Array} data - مصفوفة البيانات المراد تصديرها.
 * @param {string} fileName - اسم الملف (بدون امتداد).
 */
export function exportMissingReceiptsToExcel(data, fileName = 'Missing_Receipts_Report') {
    if (!data || data.length === 0) {
        throw new Error('لا توجد بيانات لتصديرها.');
    }

    const ws_data = [
        ['رقم السند', 'الدفتر (من-إلى)', 'المحصل', 'التاريخ التقديري', 'الحالة', 'الملاحظات']
    ];

    data.forEach(item => {
        ws_data.push([
            item.receiptNumber,
            item.notebookRange,
            item.collectorName,
            moment(item.estimatedDate).format('YYYY-MM-DD'), // تنسيق التاريخ
            item.status,
            item.notes
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Missing Receipts");
    XLSX.writeFile(wb, `${fileName}_${moment().format('YYYY-MM-DD')}.xlsx`);
}