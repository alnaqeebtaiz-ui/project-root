// --- ملف المصادقة الأولي وحماية الصفحات (النسخة النهائية) ---
// مهمة هذا الملف هي:
// 1. التحقق من أن المستخدم مسجل دخوله.
// 2. إذا لم يكن مسجلاً، يتم توجيهه فوراً إلى صفحة login.html.
// 3. عرض معلومات المستخدم والتحقق من صلاحياته من Firestore.
// 4. إدارة عملية تسجيل الخروج.

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// متغير لتخزين صلاحية المستخدم الحالي
let currentUserRole = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // المستخدم غير مسجل، أعد توجيهه لصفحة الدخول
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
            console.log("User not logged in. Redirecting...");
            window.location.href = 'login.html';
        }
    } else {
        // المستخدم مسجل، اعرض معلوماته وتحقق من صلاحياته
        console.log("User is logged in:", user.email);
        
        // عرض البريد الإلكتروني في الواجهة
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = `مرحباً, ${user.email}`;
        }

        // جلب بيانات المستخدم من Firestore لمعرفة صلاحياته
        const userDocRef = doc(db, 'users', user.uid); // نستخدم UID كمعرّف للمستند
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUserRole = userDocSnap.data().role;
            console.log("User role:", currentUserRole);
            // يمكنك هنا إخفاء أو إظهار عناصر بناءً على الصلاحية
            // مثال: if (currentUserRole !== 'admin') { document.getElementById('settings-link').style.display = 'none'; }
        } else {
            console.log("User document not found in Firestore.");
            currentUserRole = 'viewer'; // صلاحية افتراضية
        }
         // إذا كان المستخدم في صفحة تسجيل الدخول، انقله إلى لوحة التحكم
         if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// التعامل مع زر تسجيل الخروج
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log('User signed out successfully.');
            // سيتم التوجيه تلقائياً بواسطة onAuthStateChanged
        } catch (error) {
            console.error('Sign out error:', error);
            alert('حدث خطأ أثناء تسجيل الخروج.');
        }
    });
}

// دالة لمعرفة إذا كان المستخدم هو المدير
export async function isAdmin() {
    if (!auth.currentUser) return false;
    if (currentUserRole) return currentUserRole === 'admin';
    // إذا لم تكن الصلاحية قد حُددت بعد، انتظر وجرب مرة أخرى
    // هذا مجرد حل احتياطي
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() && userDocSnap.data().role === 'admin';
}

