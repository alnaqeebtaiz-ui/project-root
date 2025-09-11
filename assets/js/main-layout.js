// --- main-layout.js ---
// هذا الملف مسؤول عن إنشاء ووضع القائمة الجانبية في كل صفحات النظام.

document.addEventListener('DOMContentLoaded', () => {
    // 1. تحديد الصفحة الحالية من خلال رابط URL
    // .split('/').pop() يأخذ آخر جزء من الرابط (اسم الملف)
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    // 2. بناء كود الـ HTML الخاص بالقائمة الجانبية
    const sidebarHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2>نظام الفواتير</h2>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    <li class="nav-header">الرئيسية</li>
                    <li data-page="dashboard.html">
                        <a href="dashboard.html"><i class="fas fa-tachometer-alt"></i><span>لوحة التحكم</span></a>
                    </li>
                    
                    <li class="nav-header">الإدارة</li>
                    <li data-page="funds.html">
                        <a href="funds.html"><i class="fas fa-landmark"></i><span>إدارة الصناديق</span></a>
                    </li>
                    <li data-page="collectors.html">
                        <a href="collectors.html"><i class="fas fa-user-tie"></i><span>إدارة المحصلين</span></a>
                    </li>
                    <li data-page="subscribers.html">
                        <a href="subscribers.html"><i class="fas fa-users"></i><span>إدارة المشتركين</span></a>
                    </li>
                    <li data-page="receipts.html">
                        <a href="receipts.html"><i class="fas fa-receipt"></i><span>إدارة السندات</span></a>
                    </li>
                    <li data-page="deposits.html">
                        <a href="deposits.html"><i class="fas fa-cash-register"></i><span>إدارة التوريدات</span></a>
                    </li>
                    <li data-page="notebooks.html">
                        <a href="notebooks.html"><i class="fas fa-book-open"></i><span>إدارة الدفاتر</span></a>
                    </li>

                    <li class="nav-header">التقارير</li>
                    <li data-page="sub-reports.html">
                        <a href="sub-reports.html"><i class="fas fa-file-invoice-dollar"></i><span>تقارير المشتركين</span></a>
                    </li>
                    <li data-page="reports.html">
                        <a href="reports.html"><i class="fas fa-chart-line"></i><span>تقارير المحصلين</span></a>
                    </li>
                    <li data-page="funds-reports.html">
                        <a href="funds-reports.html"><i class="fas fa-chart-pie"></i><span>تقارير الصناديق</span></a>
                    </li>

                    <li class="nav-header">النظام</li>
                    <li data-page="admin-users.html">
                        <a href="admin_users.html"><i class="fas fa-users-cog"></i><span>إدارة المستخدمين</span></a>
                    </li>
                    <li data-page="backup.html"> 
                        <a href="backup.html"><i class="fas fa-download"></i><span>النسخ الاحتياطي</span></a>
                    </li>
                </ul>
            </nav>
        </aside>
    `;

    // 3. وضع القائمة الجانبية في بداية جسم الصفحة (<body>)
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // 4. تفعيل الرابط الخاص بالصفحة الحالية
    const activeLink = document.querySelector(`.sidebar-nav li[data-page="${currentPage}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 💡 إضافة هذا الكود لضمان أن الجسم يستخدم flexbox دائماً
    if (window.getComputedStyle(document.body).display !== 'flex') {
        document.body.style.display = 'flex';
        // يمكنك هنا إضافة margin-right للمحتوى الرئيسي إذا لم يكن معرفاً في الـ CSS الخاص بالصفحة
        // لضمان عدم تداخل الشريط الجانبي مع المحتوى.
        // يفضل أن يكون هذا الـ margin معرفاً في CSS الخاص بالصفحة نفسها.
    }
});