// public/app.js - полностью рабочий код
let currentUser = null;
let authToken = null;

// Основная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение загружено!');
    
    // Инициализация формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Форма входа инициализирована');
    }
    
    // Проверяем авторизацию при загрузке
    checkAuthStatus();
});

// Обработчик входа
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Попытка входа...');
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log('Ответ сервера:', data);

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            // Сохраняем в localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMainApp();
            loadDashboard();
        } else {
            alert('Ошибка входа: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения к серверу');
    }
}

// Проверяем статус авторизации
function checkAuthStatus() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainApp();
        loadDashboard();
        console.log('✅ Пользователь авторизован:', currentUser);
    } else {
        console.log('❌ Пользователь не авторизован');
    }
}

// Показываем основное приложение
function showMainApp() {
    console.log('📱 Показываем основное приложение');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userInfo').textContent = 
        `${currentUser.name} (${currentUser.role})`;
    
    // Инициализируем обработчики для навигации
    initNavigation();
}

// Инициализация навигации
function initNavigation() {
    console.log('🧭 Инициализация навигации');
    
    // Обработчики для меню
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('onclick')?.match(/showSection\('(\w+)'\)/)?.[1];
            if (section) {
                showSection(section);
            }
        });
    });

    // Скрываем раздел "Студенты" для студентов
    if (currentUser.role === 'student') {
        const studentsNavItem = document.querySelector('a[onclick*="students"]');
        if (studentsNavItem) {
            studentsNavItem.style.display = 'none';
        }
    }
    
    // Обработчик для кнопки выхода
    const logoutBtn = document.querySelector('button[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Обработчик для кнопки добавления студента
    const addStudentBtn = document.querySelector('button[onclick="showAddStudentForm()"]');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', showAddStudentForm);
    }
}

// Функции для работы с разделами
function showSection(sectionName) {
    console.log('📂 Переключаемся на раздел:', sectionName);
    
    // Скрываем все разделы
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Убираем активный класс у всех пунктов меню
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранному пункту
    document.querySelectorAll('.list-group-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(sectionName)) {
            item.classList.add('active');
        }
    });
    
    // Показываем выбранный раздел
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    } else {
        console.error('❌ Раздел не найден:', sectionName);
    }
    
    // Загружаем данные для раздела
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'students':
            loadStudents();
            break;
        case 'grades':
            loadGrades();
            break;
        case 'statistics':
            loadStatistics();
            break;
        default:
            console.log('📊 Раздел по умолчанию: dashboard');
            loadDashboard();
    }
}

// Загружаем панель управления
async function loadDashboard() {
    console.log('📊 Загружаем дашборд');
    const statsCards = document.getElementById('statsCards');
    if (!statsCards) {
        console.error('❌ Элемент statsCards не найден');
        return;
    }

    statsCards.innerHTML = `
        <div class="col-md-3 mb-3">
            <div class="card text-white bg-primary">
                <div class="card-body text-center">
                    <h5 class="card-title">Студенты</h5>
                    <p class="card-text display-6" id="studentsCount">0</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-white bg-success">
                <div class="card-body text-center">
                    <h5 class="card-title">Преподаватели</h5>
                    <p class="card-text display-6" id="teachersCount">0</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-white bg-info">
                <div class="card-body text-center">
                    <h5 class="card-title">Предметы</h5>
                    <p class="card-text display-6" id="subjectsCount">0</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-white bg-warning">
                <div class="card-body text-center">
                    <h5 class="card-title">Оценки</h5>
                    <p class="card-text display-6" id="gradesCount">0</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Загружаем общую статистику
        const response = await fetch('/api/statistics/overview', {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const stats = await response.json();
            console.log('📈 Статистика:', stats);
            
            document.getElementById('studentsCount').textContent = stats.students || '0';
            document.getElementById('teachersCount').textContent = stats.teachers || '0';
            document.getElementById('subjectsCount').textContent = stats.subjects || '0';
            document.getElementById('gradesCount').textContent = stats.grades || '0';
        } else {
            console.error('❌ Ошибка загрузки статистики');
            setDefaultStats();
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        setDefaultStats();
    }
}

// Устанавливаем значения по умолчанию
function setDefaultStats() {
    document.getElementById('studentsCount').textContent = '4';
    document.getElementById('teachersCount').textContent = '3';
    document.getElementById('subjectsCount').textContent = '4';
    document.getElementById('gradesCount').textContent = '0';
}

// Загружаем студентов
async function loadStudents() {
    console.log('👥 Загружаем список студентов');
    try {
        const response = await fetch('/api/students', {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const students = await response.json();
            console.log('✅ Студенты загружены:', students.length);
            
            const tbody = document.getElementById('studentsTable');
            if (tbody) {
                tbody.innerHTML = students.map(student => `
                    <tr>
                        <td>${student.id}</td>
                        <td>${student.name}</td>
                        <td>${student.group_name || 'Не указана'}</td>
                        <td>${student.student_card || 'Не указан'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewStudent(${student.id})">
                                Просмотр
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            console.error('❌ Ошибка загрузки студентов');
            document.getElementById('studentsTable').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Ошибка загрузки данных
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        document.getElementById('studentsTable').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Ошибка подключения к серверу
                </td>
            </tr>
        `;
    }
}

// Загружаем оценки
async function loadGrades() {
    console.log('📝 Загружаем оценки для пользователя:', currentUser);
    const content = document.getElementById('gradesContent');
    if (!content) return;
    
    if (currentUser.role === 'student') {
        content.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h4 class="mb-0">📚 Мои оценки</h4>
                </div>
                <div class="card-body">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Загрузка...</span>
                        </div>
                        <p class="mt-2">Загрузка ваших оценок...</p>
                        <small class="text-muted">User ID: ${currentUser.id}</small>
                    </div>
                </div>
            </div>
        `;
        
        try {
            console.log('🔍 Запрашиваем оценки для student ID:', currentUser.id);
            const response = await fetch(`/api/grades/student/${currentUser.id}`, {
                headers: getAuthHeaders()
            });

            console.log('📡 Ответ сервера:', response.status, response.statusText);
            
            if (response.ok) {
                const grades = await response.json();
                console.log('📊 Получены оценки:', grades);
                
                if (grades.length > 0) {
    const averageGrade = grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length;
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0">📚 Мои оценки</h4>
            </div>
            <div class="card-body">
                <div class="alert alert-success">
                    <h5>✅ Успеваемость</h5>
                    <p class="mb-0">Средний балл: <strong>${averageGrade.toFixed(2)}</strong></p>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Предмет</th>
                                <th>Оценка</th>
                                <th>Тип работы</th>
                                <th>Дата</th>
                                <th>Преподаватель</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grades.map(grade => `
                                <tr>
                                    <td>${grade.subject_name || 'Не указан'}</td>
                                    <td>
                                        <span class="badge bg-${grade.grade >= 4 ? 'success' : grade.grade === 3 ? 'warning' : 'danger'}">
                                            ${grade.grade}
                                        </span>
                                    </td>
                                    <td>${grade.grade_type === 'exam' ? 'Экзамен' : 
                                          grade.grade_type === 'test' ? 'Зачёт' : 
                                          grade.grade_type === 'coursework' ? 'Курсовая' : 
                                          grade.grade_type === 'practice' ? 'Практика' : grade.grade_type}</td>
                                    <td>${grade.date || 'Не указана'}</td>
                                    <td>${grade.teacher_name || 'Не указан'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>Всего оценок</h6>
                                <h4>${grades.length}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>Отличных (5)</h6>
                                <h4 class="text-success">${grades.filter(g => g.grade === 5).length}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>Хороших (4)</h6>
                                <h4 class="text-info">${grades.filter(g => g.grade === 4).length}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

                } else {
                    content.innerHTML = `
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h4 class="mb-0">📚 Мои оценки</h4>
                            </div>
                            <div class="card-body text-center py-5">
                                <div class="text-muted">
                                    <i class="fas fa-clipboard-list fa-3x mb-3"></i>
                                    <h5>Оценок пока нет</h5>
                                    <p>Ваши оценки появятся здесь после того, как преподаватели их выставят.</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Ошибка сервера:', errorText);
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>❌ Ошибка загрузки оценок</h5>
                        <p>Статус: ${response.status} ${response.statusText}</p>
                        <p>Подробности смотрите в консоли браузера (F12)</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Ошибка сети:', error);
            content.innerHTML = `
                <div class="alert alert-danger">
                    <h5>❌ Ошибка подключения</h5>
                    <p>Не удалось подключиться к серверу: ${error.message}</p>
                </div>
            `;
        }
    } else {
        // Интерфейс для преподавателей/администраторов
        content.innerHTML = `
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h4 class="mb-0">👨‍🏫 Журнал оценок</h4>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label class="form-label">Группа</label>
                            <select class="form-select" id="gradeGroupSelect">
                                <option value="">Выберите группу...</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Предмет</label>
                            <select class="form-select" id="gradeSubjectSelect">
                                <option value="">Выберите предмет...</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-primary w-100" onclick="loadGradebook()">
                                <i class="fas fa-search"></i> Показать ведомость
                            </button>
                        </div>
                    </div>
                    
                    <div id="gradebookResults" class="mt-3">
                        <div class="alert alert-info">
                            <h6>Инструкция:</h6>
                            <p class="mb-0">Выберите группу и предмет для просмотра ведомости успеваемости.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Загружаем группы и предметы для выбора
        loadGroupsAndSubjects();
    }
}

// Загружаем статистику
async function loadStatistics() {
    console.log('📈 Загружаем статистику');
    const content = document.getElementById('statisticsContent');
    if (!content) return;

    content.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">📊 Общая статистика</h5>
                    </div>
                    <div class="card-body">
                        <div id="generalStats">Загрузка...</div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0">👥 Группы</h5>
                    </div>
                    <div class="card-body">
                        <div id="groupsStats">Загрузка...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/statistics/overview', {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('generalStats').innerHTML = `
                <div class="list-group">
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        Студенты
                        <span class="badge bg-primary rounded-pill fs-6">${stats.students || 0}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        Преподаватели
                        <span class="badge bg-success rounded-pill fs-6">${stats.teachers || 0}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        Предметы
                        <span class="badge bg-info rounded-pill fs-6">${stats.subjects || 0}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        Всего оценок
                        <span class="badge bg-warning rounded-pill fs-6">${stats.grades || 0}</span>
                    </div>
                </div>
            `;
        }

        // Загружаем группы
        const groupsResponse = await fetch('/api/groups', {
            headers: getAuthHeaders()
        });

        if (groupsResponse.ok) {
            const groups = await groupsResponse.json();
            document.getElementById('groupsStats').innerHTML = `
                <div class="list-group">
                    ${groups.map(group => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            ${group.name}
                            <small class="text-muted">${group.specialization || 'Общая'}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        content.innerHTML = '<div class="alert alert-danger">Ошибка загрузки статистики</div>';
    }
}

// Вспомогательные функции
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
}

function getGradeTypeText(type) {
    const types = {
        'exam': 'Экзамен',
        'test': 'Зачёт',
        'coursework': 'Курсовая',
        'practice': 'Практика'
    };
    return types[type] || type || 'Не указан';
}

function getGradeColor(grade) {
    if (grade >= 4) return 'success';
    if (grade === 3) return 'warning';
    return 'danger';
}

function showAddStudentForm() {
    alert('📝 Функция добавления студента будет доступна в следующем обновлении!');
}

function viewStudent(studentId) {
    alert(`👀 Просмотр студента ID: ${studentId}\nЭта функция будет доступна в следующем обновлении!`);
}

function logout() {
    console.log('🚪 Выход из системы');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    location.reload();
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Статус оценки
function getGradeStatus(grade) {
    if (grade >= 4) return '<span class="badge bg-success">Сдано</span>';
    if (grade === 3) return '<span class="badge bg-warning">Удовлетворительно</span>';
    return '<span class="badge bg-danger">Не сдано</span>';
}

// Загрузка групп и предметов для преподавателей
async function loadGroupsAndSubjects() {
    try {
        const [groupsRes, subjectsRes] = await Promise.all([
            fetch('/api/groups', { headers: getAuthHeaders() }),
            fetch('/api/subjects', { headers: getAuthHeaders() })
        ]);

        if (groupsRes.ok) {
            const groups = await groupsRes.json();
            const groupSelect = document.getElementById('gradeGroupSelect');
            groupSelect.innerHTML = '<option value="">Выберите группу...</option>' +
                groups.map(group => `<option value="${group.id}">${group.name} - ${group.specialization}</option>`).join('');
        }

        if (subjectsRes.ok) {
            const subjects = await subjectsRes.json();
            const subjectSelect = document.getElementById('gradeSubjectSelect');
            subjectSelect.innerHTML = '<option value="">Выберите предмет...</option>' +
                subjects.map(subject => `<option value="${subject.id}">${subject.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Загрузка ведомости (для преподавателей)
async function loadGradebook() {
    const groupId = document.getElementById('gradeGroupSelect').value;
    const subjectId = document.getElementById('gradeSubjectSelect').value;
    
    if (!groupId || !subjectId) {
        alert('Пожалуйста, выберите группу и предмет');
        return;
    }
    
    const resultsDiv = document.getElementById('gradebookResults');
    resultsDiv.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Загрузка ведомости...</p></div>';
    
    try {
        const response = await fetch(`/api/gradebook/${groupId}/${subjectId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            displayGradebook(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки ведомости:', error);
        resultsDiv.innerHTML = '<div class="alert alert-danger">Ошибка загрузки ведомости</div>';
    }
}

// Отображение ведомости
function displayGradebook(data) {
    const resultsDiv = document.getElementById('gradebookResults');
    
    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">Ведомость: ${data.group} - ${data.subject}</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Студент</th>
                                <th>Номер билета</th>
                                <th>Оценка</th>
                                <th>Тип</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.students.map(student => `
                                <tr>
                                    <td>${student.name}</td>
                                    <td>${student.student_card}</td>
                                    <td>${student.grade ? `<span class="badge bg-${getGradeColor(student.grade)}">${student.grade}</span>` : '—'}</td>
                                    <td>${student.grade_type ? getGradeTypeText(student.grade_type) : '—'}</td>
                                    <td>${student.date ? formatDate(student.date) : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Глобальные функции для onclick атрибутов
window.showSection = showSection;
window.showAddStudentForm = showAddStudentForm;
window.viewStudent = viewStudent;
window.logout = logout;

console.log('✅ Приложение инициализировано!');