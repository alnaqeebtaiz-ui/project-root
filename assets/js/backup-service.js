// D:\project-root\assets\js\backup-service.js
/*
 * Backup Service
 * This file will contain logic for downloading local backups (JSON/CSV).
 */

const API_URL = 'https://alnaqeeb.onrender.com/api'; // تأكد من أن هذا هو الـ URL الصحيح للـ Backend

// 💡💡💡 إضافة دوال جلب التوكن و رؤوس الطلب 💡💡💡
const getAuthToken = () => localStorage.getItem('jwtToken');

const getAuthHeaders = (contentType = 'application/json') => {
    const token = getAuthToken();
    if (!token) {
        // يمكن إعادة التوجيه لصفحة تسجيل الدخول إذا لم يتوفر التوكن
        window.location.href = '/login.html';
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    const headers = {
        'x-auth-token': token // إضافة التوكن هنا
    };
    // لا نضع Content-Type لطلب التنزيل لأنه يعالج ملف
    // ولكن نتركه هنا كدالة عامة إن احتجتها في مكان آخر
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
};


/**
 * 💡💡💡 دالة جديدة لتنزيل النسخة الاحتياطية من الخادم 💡💡💡
 * تتصل بـ /api/backup/download
 * @returns {Promise<void>}
 */
export async function downloadServerBackup() {
    try {
        const headers = getAuthHeaders(null); // لا نحدد Content-Type لطلب التنزيل
        const response = await fetch(`${API_URL}/backup/download`, {
            method: 'GET',
            headers: headers // إضافة توكن المصادقة
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // إذا كان هناك مشكلة في المصادقة/الترخيص
                throw new Error('غير مصرح لك بتنزيل النسخة الاحتياطية. يرجى تسجيل الدخول.');
            }
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في تنزيل النسخة الاحتياطية من الخادم.');
        }

        // إذا كان الاستجابة OK، فإنها ملف. استخدم Blob لتنزيله.
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'backup.zip'; // اسم افتراضي

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Backup file download initiated.");
        return { success: true, message: "تم بدء تنزيل النسخة الاحتياطية." };

    } catch (error) {
        console.error("Error downloading backup:", error);
        // لا تعيد التوجيه هنا لأن getAuthHeaders تقوم بذلك بالفعل إذا لم يكن هناك توكن
        throw error; // أعد رمي الخطأ للتعامل معه في الواجهة الأمامية
    }
}


// Example function to download data as JSON (أبقها إذا كنت لا تزال تستخدمها)
export function downloadJson(data, filename) {
    const dataStr = JSON.stringify(data, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Example function to download data as CSV (أبقها إذا كنت لا تزال تستخدمها)
export function downloadCsv(data, filename) {
    if (!data || data.length === 0) {
        console.warn("No data to export to CSV.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(",")); // Add headers

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""'); // Escaping double quotes for CSV
            return `"${escaped}"`;
        });
        csvRows.push(values.join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "backup.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

console.log("backup-service.js loaded. New server backup functionality added.");