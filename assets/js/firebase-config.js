// --- ملف الإعدادات المركزي لـ Firebase (الإصدار الحديث والنهائي) ---
// هذا الملف يقوم بتهيئة الاتصال بخدمات Firebase باستخدام إعداداتك الخاصة.
// جميع ملفات جافاسكريبت الأخرى في المشروع ستعتمد على هذا الملف.

// الخطوة 1: استيراد الدوال الأساسية من حزمة Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// الخطوة 2: إعدادات مشروعك الخاصة (تم نسخها من حسابك في Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyCVPNPyewjpf8t-BvDDZ1PbnjAjQVauUfs",
  authDomain: "electricity-bills-manage-e86f6.firebaseapp.com",
  projectId: "electricity-bills-manage-e86f6",
  storageBucket: "electricity-bills-manage-e86f6.appspot.com",
  messagingSenderId: "759991618639",
  appId: "1:759991618639:web:b17d3a32a1c9a8d4216e3a"
};

// الخطوة 3: تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// الخطوة 4: تهيئة الخدمات التي ستحتاجها في المشروع
const db = getFirestore(app);         // للتعامل مع قاعدة البيانات Firestore
const auth = getAuth(app);            // للتعامل مع مصادقة المستخدمين
const storage = getStorage(app);      // للتعامل مع تخزين الملفات (للنسخ الاحتياطي مثلاً)

// الخطوة 5: تصدير الكائنات لجعلها متاحة للاستيراد في الملفات الأخرى
export { db, auth, storage };

