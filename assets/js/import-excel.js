/**
 * import-excel.js
 * يحتوي هذا الملف على وظائف لقراءة ومعالجة البيانات من ملفات Excel.
 */

/**
 * دالة أساسية لقراءة أي ملف Excel وتحويله إلى JSON.
 * @param {File} file - ملف Excel الذي تم اختياره.
 * @returns {Promise<Array<Object>>}
 */
function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * يعالج بيانات المشتركين المستوردة من Excel.
 * @param {File} file - ملف Excel للمشتركين.
 * @returns {Promise<{success: boolean, data?: Array<Object>, error?: string}>}
 */
export async function importSubscribersFromExcel(file) {
    try {
        const rows = await parseExcelFile(file);
        
        if (!rows || rows.length === 0) {
            return { success: false, error: "الملف فارغ أو غير صحيح." };
        }

        const subscribers = rows.map(row => {
            const name = row['اسم المشترك'] || row['Name'];
            const address = row['العنوان'] || row['Address'];
            const phone = row['رقم الهاتف'] || row['Phone'];
            // --- تم حذف الأسطر الخاصة بـ registrationDate من هنا ---

            return {
                name: String(name || '').trim(),
                address: String(address || '').trim(),
                phone: String(phone || '').trim()
                // --- وتم حذفه من الكائن المعاد أيضًا ---
            };
        })
        .filter(subscriber => subscriber.name !== '');

        if (subscribers.length === 0) {
            return { success: false, error: "لم يتم العثور على بيانات مشتركين صالحة." };
        }

        return { success: true, data: subscribers };

    } catch (error) {
        console.error("Error processing Excel file:", error);
        return { success: false, error: "حدث خطأ أثناء قراءة الملف." };
    }
}


/**
 * يعالج بيانات كشف التحصيل اليومي المستوردة من Excel.
 * * !!!--- هذه الدالة لم يتم لمسها أو تغييرها بناءً على طلبك ---!!!
 * */
export async function importReceiptsFromExcel(file) {
    try {
        const rows = await parseExcelFile(file);
        
        if (!rows || rows.length === 0) {
            return { success: false, error: "ملف كشف التحصيل فارغ أو غير صحيح." };
        }

        const receipts = rows.map(row => {
            // التعامل مع أسماء الأعمدة المحتملة لكشف التحصيل
            const receiptNumber = row['رقم سند التحصيل'] || row['رقم السند'];
            const amount = row['مبلغ التحصيل'] || row['المبلغ'];
            const collectorCode = row['رقم المحصل'] || row['كود المحصل'];
            const subscriberName = row['اسم المشترك'];
            const dateFromExcel = row['التاريخ']; // التاريخ الأصلي من الإكسل

            // !! --- هذا هو التعديل المطلوب --- !!
            let correctedDate = null;
            if (dateFromExcel instanceof Date && !isNaN(dateFromExcel)) {
                // تصحيح التاريخ لتعويض فارق التوقيت المحلي وجعله بتوقيت UTC
                correctedDate = new Date(dateFromExcel.getTime() - (dateFromExcel.getTimezoneOffset() * 60000));
            }
            // !! --- نهاية التعديل --- !!

            return {
                receiptNumber: parseInt(receiptNumber, 10),
                amount: parseFloat(amount),
                collectorCode: String(collectorCode || '').trim(),
                subscriberName: String(subscriberName || '').trim(),
                date: correctedDate, // نستخدم هنا التاريخ المصحح
            };
        })
        // فلترة الصفوف التي لا تحتوي على البيانات الأساسية
        .filter(receipt => 
            receipt.receiptNumber && 
            receipt.amount && 
            receipt.collectorCode && 
            receipt.subscriberName &&
            receipt.date // التأكد من وجود التاريخ المصحح
        );

        if (receipts.length === 0) {
            return { success: false, error: "لم يتم العثور على بيانات صالحة. تأكد من وجود الأعمدة المطلوبة (التاريخ, اسم المشترك, رقم المحصل, المبلغ, رقم السند)." };
        }

        return { success: true, data: receipts };

    } catch (error) {
        console.error("Error processing receipts Excel file:", error);
        return { success: false, error: "حدث خطأ أثناء قراءة ملف كشف التحصيل." };
    }
}