document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود دالة showToast قبل استخدامها
    if (typeof showToast !== 'function') {
        console.error("Fatal Error: showToast function not found. Is utils.js loaded correctly?");
        // عرض تنبيه بسيط للمستخدم كحل بديل
        alert("خطأ فادح: لم يتم تحميل ملف utils.js بشكل صحيح.");
        return;
    }

    // جلب وعرض الدفاتر عند تحميل الصفحة
    fetchAndDisplayNotebooks();

    // ربط الأحداث بالأزرار والنماذج
    const syncBtn = document.getElementById('sync-btn');
    const modal = document.getElementById('edit-missing-receipt-modal');
    const closeBtn = document.querySelector('.modal .close-button');
    const editForm = document.getElementById('edit-missing-receipt-form');

    // حدث زر المزامنة
    syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المزامنة...';
        showToast('بدء عملية المزامنة...', 'info');
        
        try {
            const response = await fetch('/api/notebooks/sync', { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'فشل في المزامنة' }));
                throw new Error(errorData.message);
            }
            const result = await response.json();
            showToast(result.message, 'success');
            await fetchAndDisplayNotebooks(); // إعادة تحميل البيانات بعد المزامنة
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث ومزامنة الدفاتر';
        }
    });

    // أحداث الـ Modal
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // حدث حفظ النموذج
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const notebookId = document.getElementById('modal-notebook-id').value;
        const receiptNumber = document.getElementById('modal-receipt-number').value;
        const status = document.getElementById('missing-status').value;
        const notes = document.getElementById('missing-notes').value;
        
        try {
            const response = await fetch(`/api/notebooks/missing/${notebookId}/${receiptNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            if (!response.ok) throw new Error('فشل في حفظ التغييرات');
            showToast('تم حفظ التغييرات بنجاح', 'success');
            modal.style.display = 'none';
            await fetchAndDisplayNotebooks();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
});

// دالة لجلب وعرض الدفاتر
async function fetchAndDisplayNotebooks() {
    const container = document.getElementById('notebooks-container');
    container.innerHTML = '<div class="loader"></div>';
    try {
        const response = await fetch('/api/notebooks');
        if (!response.ok) throw new Error('فشل تحميل الدفاتر من الخادم');
        const notebooks = await response.json();
        renderNotebooks(notebooks);
    } catch (error) {
        container.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function renderNotebooks(notebooks) {
    const container = document.getElementById('notebooks-container');
    container.innerHTML = '';
    if (notebooks.length === 0) {
        container.innerHTML = '<p>لم تتم مزامنة أي دفاتر بعد. اضغط على زر المزامنة للبدء.</p>';
        return;
    }
    notebooks.forEach(notebook => {
        const card = document.createElement('div');
        card.className = 'card notebook-card';
        const missingCount = notebook.missingReceipts.length;
        const status = missingCount === 0 ? 'مكتمل' : 'غير مكتمل';
        const statusClass = missingCount === 0 ? 'status-success' : 'status-danger';
        let missingReceiptsHTML = '<p>لا توجد سندات مفقودة في هذا الدفتر.</p>';
        if (missingCount > 0) {
            missingReceiptsHTML = `
                <strong>السندات المفقودة (${missingCount}):</strong>
                <div class="missing-receipts-list">
                    ${notebook.missingReceipts.map(r => `
                        <span class="missing-receipt-item" 
                              data-notebook-id="${notebook._id}" 
                              data-receipt-number="${r.receiptNumber}"
                              data-status="${r.status}"
                              data-notes="${r.notes || ''}"
                              title="اضغط للتعديل - الحالة: ${r.status}">
                            ${r.receiptNumber}
                        </span>
                    `).join('')}
                </div>`;
        }
        card.innerHTML = `
            <div class="notebook-card-header ${missingCount > 0 ? 'border-danger' : ''}">
                <h4>دفتر: ${notebook.startNumber} - ${notebook.endNumber}</h4>
                <span class="status ${statusClass}">${status}</span>
            </div>
            <div class="notebook-card-body">
                <div class="info-grid">
                    <p><strong>المحصل:</strong> ${notebook.collectorName}</p>
                    <p><strong>الحالة:</strong> ${notebook.status}</p>
                </div>
                <div class="missing-receipts-details">
                    ${missingReceiptsHTML}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    document.querySelectorAll('.missing-receipt-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const data = e.target.dataset;
            document.getElementById('modal-notebook-id').value = data.notebookId;
            document.getElementById('modal-receipt-number').value = data.receiptNumber;
            document.getElementById('receipt-number-display').value = data.receiptNumber;
            document.getElementById('missing-status').value = data.status;
            document.getElementById('missing-notes').value = data.notes;
            document.getElementById('edit-missing-receipt-modal').style.display = 'flex';
        });
    });
}
