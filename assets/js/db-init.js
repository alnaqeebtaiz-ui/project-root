// --- ملف تهيئة قاعدة البيانات (النسخة النهائية والمكتملة) ---
// مهمة هذا الملف هي التأكد من وجود جميع المجموعات (Collections) المطلوبة في Firestore.
// يتم تشغيله مرة واحدة عند فتح لوحة التحكم لإنشاء الهيكل الأساسي للبيانات.

import { db } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// دالة للتحقق مما إذا كانت المجموعة فارغة
async function isCollectionEmpty(collectionName) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.empty;
}

// الدالة الرئيسية لتهيئة قاعدة البيانات
async function initializeDatabase() {
    console.log("Checking database structure...");
    try {
        // نستخدم writeBatch لتنفيذ جميع عمليات الكتابة مرة واحدة إذا لزم الأمر
        const batch = writeBatch(db);
        let operationsNeeded = false;

        // 1. التحقق من مجموعة المستخدمين (Users)
        if (await isCollectionEmpty('users')) {
            console.log("Creating sample user...");
            operationsNeeded = true;
            const adminUserRef = doc(db, 'users', 'admin_placeholder_id');
            batch.set(adminUserRef, {
                name: 'مدير النظام',
                email: 'admin@example.com',
                role: 'admin',
                createdAt: new Date()
            });
        }

        // 2. التحقق من مجموعة المشتركين (Subscribers)
        if (await isCollectionEmpty('subscribers')) {
            console.log("Creating sample subscriber...");
            operationsNeeded = true;
            const subscriberRef = doc(collection(db, 'subscribers'));
            batch.set(subscriberRef, {
                name: 'مشترك نموذجي',
                address: 'العنوان',
                phone: '123456789',
                registrationDate: new Date()
            });
        }

        // 3. التحقق من مجموعة المحصلين (Collectors)
        if (await isCollectionEmpty('collectors')) {
            console.log("Creating sample collector...");
            operationsNeeded = true;
            const collectorRef = doc(collection(db, 'collectors'));
            batch.set(collectorRef, {
                name: 'محصل نموذجي',
                collectorNumber: 'C001',
                openingBalance: 0,
                isActive: true
            });
        }

        // --- إضافة المجموعات المتبقية ---

        // 4. التحقق من مجموعة الصناديق (Funds)
        if (await isCollectionEmpty('funds')) {
            console.log("Initializing 'funds' collection...");
            operationsNeeded = true;
            const fundRef = doc(db, 'funds', '_placeholder');
            batch.set(fundRef, { note: 'This collection holds fund deposit records.' });
        }

        // 5. التحقق من مجموعة السندات (Receipts)
        if (await isCollectionEmpty('receipts')) {
            console.log("Initializing 'receipts' collection...");
            operationsNeeded = true;
            const receiptRef = doc(db, 'receipts', '_placeholder');
            batch.set(receiptRef, { note: 'This collection holds all payment receipts.' });
        }

        // 6. التحقق من مجموعة دفاتر السندات (Notebooks)
        if (await isCollectionEmpty('notebooks')) {
            console.log("Initializing 'notebooks' collection...");
            operationsNeeded = true;
            const notebookRef = doc(db, 'notebooks', '_placeholder');
            batch.set(notebookRef, { note: 'This collection tracks receipt notebooks.' });
        }

        // 7. التحقق من مجموعة سجلات الاستيراد (Imports)
        if (await isCollectionEmpty('imports')) {
            console.log("Initializing 'imports' collection...");
            operationsNeeded = true;
            const importRef = doc(db, 'imports', '_placeholder');
            batch.set(importRef, { note: 'This collection logs Excel file imports.' });
        }

        // 8. التحقق من مجموعة التقارير (Reports)
        if (await isCollectionEmpty('reports')) {
            console.log("Initializing 'reports' collection...");
            operationsNeeded = true;
            const reportRef = doc(db, 'reports', '_placeholder');
            batch.set(reportRef, { note: 'This collection can save report settings.' });
        }

        // إذا كانت هناك عمليات جديدة، قم بتنفيذها
        if (operationsNeeded) {
            await batch.commit();
            console.log("Database structure successfully verified and updated!");
        } else {
            console.log("Database structure is already up to date.");
        }

    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

// تشغيل الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializeDatabase);

