// Функции для экспорта в PDF

// Экспорт отчета по студенту в PDF
function exportStudentToPDF(studentId) {
    showLoading('Генерация PDF отчета...');
    
    const url = `/api/statistics/student/${studentId}/pdf`;
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Получаем имя студента для имени файла
        const studentName = document.querySelector(`[data-student-id="${studentId}"]`)?.closest('tr')?.querySelector('strong')?.textContent || 'student';
        const fileName = `report-${studentName.replace(/\s+/g, '_')}.pdf`;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        hideLoading();
        showNotification('PDF отчет успешно сгенерирован!', 'success');
    })
    .catch(error => {
        console.error('Ошибка экспорта в PDF:', error);
        hideLoading();
        showNotification(`Ошибка генерации PDF: ${error.message}`, 'error');
    });
}

// Экспорт отчета по группе в PDF
function exportGroupToPDF(groupId) {
    showLoading('Генерация PDF отчета группы...');
    
    const url = `/api/statistics/group/${groupId}/pdf`;
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const groupName = document.querySelector(`[data-group-id="${groupId}"]`)?.textContent || 'group';
        const fileName = `group-report-${groupName.replace(/\s+/g, '_')}.pdf`;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        hideLoading();
        showNotification('PDF отчет группы успешно сгенерирован!', 'success');
    })
    .catch(error => {
        console.error('Ошибка экспорта в PDF:', error);
        hideLoading();
        showNotification(`Ошибка генерации PDF: ${error.message}`, 'error');
    });
}

// Просмотр HTML отчета по студенту
function viewStudentReport(studentId) {
    showLoading('Генерация HTML отчета...');
    
    const url = `/api/statistics/student/${studentId}/html`;
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'text/html'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
        // Открываем HTML в новом окне
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
        
        hideLoading();
    })
    .catch(error => {
        console.error('Ошибка загрузки HTML отчета:', error);
        hideLoading();
        showNotification(`Ошибка загрузки отчета: ${error.message}`, 'error');
    });
}

// Просмотр HTML отчета по группе
function viewGroupReport(groupId) {
    showLoading('Генерация HTML отчета группы...');
    
    const url = `/api/statistics/group/${groupId}/html`;
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'text/html'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
        // Открываем HTML в новом окне
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
        
        hideLoading();
    })
    .catch(error => {
        console.error('Ошибка загрузки HTML отчета:', error);
        hideLoading();
        showNotification(`Ошибка загрузки отчета: ${error.message}`, 'error');
    });
}

// Вспомогательные функции
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function showLoading(message = 'Загрузка...') {
    let loadingEl = document.getElementById('loading-overlay');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loading-overlay';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loadingEl.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            ">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-2">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingEl);
    }
    loadingEl.style.display = 'flex';
}

function hideLoading() {
    const loadingEl = document.getElementById('loading-overlay');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease;
    `;
    
    const bgColors = {
        success: 'linear-gradient(135deg, #27ae60, #229954)',
        error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        info: 'linear-gradient(135deg, #3498db, #2980b9)'
    };
    
    notification.style.background = bgColors[type] || bgColors.info;
    
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: 10px;
        ">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Добавляем стили для анимации
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}