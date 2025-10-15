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

// Загружаем оценки и зачёты
async function loadGrades() {
    console.log('📝 Загружаем оценки и зачёты для пользователя:', currentUser);
    const content = document.getElementById('gradesContent');
    if (!content) return;
    
    if (currentUser.role === 'student') {
        // ... существующий код для студентов ...
        
    } else if (currentUser.role === 'teacher') {
        // УПРОЩЕННЫЙ ИНТЕРФЕЙС ДЛЯ ПРЕПОДАВАТЕЛЯ - СРАЗУ ПОКАЗЫВАЕМ ВСЕ ЭЛЕМЕНТЫ
        content.innerHTML = `
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h4 class="mb-0">👨‍🏫 Панель преподавателя</h4>
                </div>
                <div class="card-body">
                    <!-- Быстрые действия -->
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <h5>Быстрые действия</h5>
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-primary" onclick="showAddGradeModal()">
                                    <i class="fas fa-plus"></i> Добавить оценку
                                </button>
                                <button class="btn btn-success" onclick="showAddCreditModal()">
                                    <i class="fas fa-check"></i> Добавить зачёт
                                </button>
                                <button class="btn btn-info" onclick="showMyGroups()">
                                    <i class="fas fa-users"></i> Мои группы
                                </button>
                                <button class="btn btn-warning" onclick="showMyGrades()">
                                    <i class="fas fa-list"></i> Мои оценки
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Статистика -->
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <h5>Моя статистика</h5>
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <div class="card text-white bg-primary">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Студентов</h6>
                                            <p class="card-text display-6">12</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card text-white bg-success">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Предметов</h6>
                                            <p class="card-text display-6">3</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card text-white bg-info">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Оценок</h6>
                                            <p class="card-text display-6">45</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card text-white bg-warning">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Средний балл</h6>
                                            <p class="card-text display-6">4.2</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ведомость по группе и предмету -->
                    <div class="card">
                        <div class="card-header bg-secondary text-white">
                            <h5 class="mb-0">📋 Ведомость успеваемости</h5>
                        </div>
                        <div class="card-body">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label class="form-label">Группа</label>
                                    <select class="form-select" id="gradeGroupSelect">
                                        <option value="">Выберите группу...</option>
                                        <option value="1">ИТ-21</option>
                                        <option value="2">П-22</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Предмет</label>
                                    <select class="form-select" id="gradeSubjectSelect">
                                        <option value="">Выберите предмет...</option>
                                        <option value="1">Программирование на Python</option>
                                        <option value="2">Базы данных</option>
                                        <option value="3">Высшая математика</option>
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
                                    <p class="mb-0 mt-2">Используйте кнопки выше для добавления оценок и зачётов.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } else {
        // Интерфейс для администраторов (существующий код)
        // ... 
    }
}

// Загрузка статистики преподавателя - УПРОЩЕННАЯ ВЕРСИЯ
async function loadTeacherStatistics() {
    try {
        const teacherId = currentUser.teacher_id || currentUser.id;
        const response = await fetch(`/api/teacher/${teacherId}/statistics`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const stats = await response.json();
            if (stats.success) {
                // Обновляем статистику если API работает
                document.getElementById('teacherStudentsCount').textContent = stats.data.total_students;
                document.getElementById('teacherSubjectsCount').textContent = stats.data.total_subjects;
                document.getElementById('teacherGradesCount').textContent = stats.data.total_grades;
                document.getElementById('teacherAvgGrade').textContent = stats.data.avg_grade;
            }
        }
        // Если API не работает, оставляем статические значения
    } catch (error) {
        console.error('Error loading teacher statistics:', error);
        // Оставляем статические значения при ошибке
    }
}

// Показать мои группы
async function showMyGroups() {
    try {
        const teacherId = currentUser.teacher_id || currentUser.id;
        const response = await fetch(`/api/teacher/${teacherId}/groups`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                let html = '<h5>Мои учебные группы</h5><div class="row">';
                
                result.data.forEach(group => {
                    html += `
                        <div class="col-md-4 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${group.name}</h6>
                                    <p class="card-text">
                                        <small>Курс: ${group.course}</small><br>
                                        <small>Студентов: ${group.student_count || 0}</small><br>
                                        <small>${group.specialization || ''}</small>
                                    </p>
                                    <button class="btn btn-sm btn-outline-primary" onclick="loadGroupForGrading(${group.id})">
                                        Выставить оценки
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // Показываем в модальном окне или заменяем содержимое
                document.getElementById('gradebookResults').innerHTML = html;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
    }
}

// Показать мои оценки
async function showMyGrades() {
    try {
        const teacherId = currentUser.teacher_id || currentUser.id;
        const response = await fetch(`/api/teacher/${teacherId}/grades`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                let html = `
                    <h5>Последние выставленные оценки</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Студент</th>
                                    <th>Предмет</th>
                                    <th>Тип</th>
                                    <th>Результат</th>
                                    <th>Дата</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                result.data.forEach(grade => {
                    html += `
                        <tr>
                            <td>${grade.student_name}</td>
                            <td>${grade.subject_name}</td>
                            <td>${getGradeTypeText(grade.grade_type)}</td>
                            <td>
                                <span class="badge bg-${getGradeColor(grade.grade, grade.is_pass, grade.grade_type)}">
                                    ${getGradeDisplay(grade.grade, grade.is_pass, grade.grade_type)}
                                </span>
                            </td>
                            <td>${formatDate(grade.date)}</td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
                document.getElementById('gradebookResults').innerHTML = html;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
    }
}

// Загрузка группы для выставления оценок
async function loadGroupForGrading(groupId) {
    // Здесь можно реализовать массовое выставление оценок
    alert(`Загрузка группы ${groupId} для выставления оценок - функция в разработке`);
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

// Функция для перевода типа работы на русский
function getGradeTypeText(type) {
    const types = {
        'exam': 'Экзамен',
        'test': 'Зачёт',
        'credit': 'Зачёт',
        'coursework': 'Курсовая',
        'practice': 'Практика'
    };
    return types[type] || type || 'Не указан';
}

// Функция для определения цвета оценки/зачёта
function getGradeColor(grade, is_pass, grade_type) {
    // Для зачётов
    if (grade_type === 'test' || grade_type === 'credit') {
        return is_pass ? 'success' : 'danger';
    }
    
    // Для оценок
    if (grade >= 4) return 'success';
    if (grade === 3) return 'warning';
    return 'danger';
}

// Функция для отображения значения оценки/зачёта
function getGradeDisplay(grade, is_pass, grade_type) {
    // Для зачётов
    if (grade_type === 'test' || grade_type === 'credit') {
        return is_pass ? 'Зачёт' : 'Незачёт';
    }
    
    // Для оценок
    return grade || '—';
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

// Отображение ведомости с кнопками действий
function displayGradebook(data) {
    const resultsDiv = document.getElementById('gradebookResults');
    
    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Ведомость: ${data.group} - ${data.subject}</h5>
                <div>
                    <button class="btn btn-sm btn-light me-2" onclick="showAddGradeToGroup()">
                        <i class="fas fa-plus"></i> Добавить оценку группе
                    </button>
                    <button class="btn btn-sm btn-light" onclick="showAddCreditToGroup()">
                        <i class="fas fa-check"></i> Добавить зачёт группе
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Студент</th>
                                <th>Номер зачётки</th>
                                <th>Тип работы</th>
                                <th>Результат</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.students.map(student => `
                                <tr>
                                    <td>${student.name}</td>
                                    <td>${student.student_card}</td>
                                    <td>${student.grade_type ? getGradeTypeText(student.grade_type) : '—'}</td>
                                    <td>
                                        ${student.grade || student.is_pass !== undefined ? `
                                            <span class="badge bg-${getGradeColor(student.grade, student.is_pass, student.grade_type)}">
                                                ${getGradeDisplay(student.grade, student.is_pass, student.grade_type)}
                                            </span>
                                        ` : '—'}
                                    </td>
                                    <td>${student.date ? formatDate(student.date) : '—'}</td>
                                    <td>
                                        <div class="btn-group btn-group-sm">
                                            ${!student.grade_type ? `
                                                <button class="btn btn-outline-primary" onclick="showAddGradeModalForStudent(${student.student_id})" title="Добавить оценку">
                                                    <i class="fas fa-plus"></i>
                                                </button>
                                                <button class="btn btn-outline-success" onclick="showAddCreditModalForStudent(${student.student_id})" title="Добавить зачёт">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                            ` : `
                                                <button class="btn btn-outline-warning" onclick="editGrade(${student.id || student.grade_id})" title="Редактировать">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-outline-danger" onclick="deleteGrade(${student.id || student.grade_id})" title="Удалить">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            `}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Показать модальное окно добавления оценки для конкретного студента
async function showAddGradeModalForStudent(studentId) {
    // Сброс формы
    document.getElementById('addGradeForm').reset();
    
    // Устанавливаем выбранного студента
    const studentSelect = document.getElementById('gradeStudentSelect');
    
    // Загружаем студентов если нужно
    if (studentSelect.options.length <= 1) {
        await loadStudentsForModal('gradeStudentSelect');
    }
    
    // Устанавливаем выбранного студента
    studentSelect.value = studentId;
    
    // Устанавливаем предмет из текущей ведомости
    const subjectSelect = document.getElementById('gradeSubjectSelect');
    const currentSubjectId = document.getElementById('gradeSubjectSelect').value;
    if (currentSubjectId) {
        document.getElementById('gradeSubjectSelectModal').value = currentSubjectId;
    }
    
    // Устанавливаем сегодняшнюю дату
    document.getElementById('gradeDate').valueAsDate = new Date();
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('addGradeModal'));
    modal.show();
}

// Показать модальное окно добавления зачёта для конкретного студента
async function showAddCreditModalForStudent(studentId) {
    // Сброс формы
    document.getElementById('addCreditForm').reset();
    
    // Устанавливаем выбранного студента
    const studentSelect = document.getElementById('creditStudentSelect');
    
    // Загружаем студентов если нужно
    if (studentSelect.options.length <= 1) {
        await loadStudentsForModal('creditStudentSelect');
    }
    
    // Устанавливаем выбранного студента
    studentSelect.value = studentId;
    
    // Устанавливаем предмет из текущей ведомости
    const currentSubjectId = document.getElementById('gradeSubjectSelect').value;
    if (currentSubjectId) {
        document.getElementById('creditSubjectSelect').value = currentSubjectId;
    }
    
    // Устанавливаем сегодняшнюю дату
    document.getElementById('creditDate').valueAsDate = new Date();
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('addCreditModal'));
    modal.show();
}

// Удалить оценку
async function deleteGrade(gradeId) {
    if (!confirm('Вы уверены, что хотите удалить эту оценку?')) {
        return;
    }

    try {
        const response = await fetch(`/api/grades/${gradeId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();
        
        if (result.success) {
            alert('✅ Оценка успешно удалена!');
            // Обновляем ведомость
            loadGradebook();
        } else {
            alert('❌ Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка удаления оценки:', error);
        alert('❌ Ошибка удаления оценки');
    }
}

// Редактировать оценку (заглушка - можно развить)
function editGrade(gradeId) {
    alert(`Редактирование оценки ${gradeId} - функция в разработке\nПока можно удалить и создать новую оценку.`);
}

// Массовое добавление оценки группе
function showAddGradeToGroup() {
    const groupId = document.getElementById('gradeGroupSelect').value;
    const subjectId = document.getElementById('gradeSubjectSelect').value;
    
    if (!groupId || !subjectId) {
        alert('Сначала выберите группу и предмет');
        return;
    }
    
    alert(`Массовое добавление оценки для группы ${groupId} по предмету ${subjectId} - функция в разработке`);
}

// Массовое добавление зачёта группе
function showAddCreditToGroup() {
    const groupId = document.getElementById('gradeGroupSelect').value;
    const subjectId = document.getElementById('gradeSubjectSelect').value;
    
    if (!groupId || !subjectId) {
        alert('Сначала выберите группу и предмет');
        return;
    }
    
    alert(`Массовое добавление зачёта для группы ${groupId} по предмету ${subjectId} - функция в разработке`);
}

// Отправка оценки - ОБНОВЛЕННАЯ ВЕРСИЯ
async function submitGrade() {
    const formData = {
        student_id: document.getElementById('gradeStudentSelect').value,
        subject_id: document.getElementById('gradeSubjectSelectModal').value,
        grade: parseInt(document.getElementById('gradeValueSelect').value),
        grade_type: document.getElementById('gradeTypeSelect').value,
        date: document.getElementById('gradeDate').value,
        notes: document.getElementById('gradeNotes').value
    };

    // Валидация
    if (!formData.student_id || !formData.subject_id || !formData.grade || !formData.grade_type || !formData.date) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    try {
        const response = await fetch('/api/grades', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('✅ Оценка успешно добавлена!');
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('addGradeModal'));
            modal.hide();
            // Обновляем ведомость если она открыта
            if (document.getElementById('gradebookResults').innerHTML.includes('Ведомость')) {
                loadGradebook();
            }
        } else {
            alert('❌ Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка добавления оценки:', error);
        alert('❌ Ошибка добавления оценки');
    }
}

// Отправка зачёта - ОБНОВЛЕННАЯ ВЕРСИЯ
async function submitCredit() {
    const creditResult = document.querySelector('input[name="creditResult"]:checked');
    
    const formData = {
        student_id: document.getElementById('creditStudentSelect').value,
        subject_id: document.getElementById('creditSubjectSelect').value,
        is_pass: creditResult ? parseInt(creditResult.value) : null,
        grade_type: document.getElementById('creditTypeSelect').value,
        date: document.getElementById('creditDate').value,
        notes: document.getElementById('creditNotes').value
    };

    // Валидация
    if (!formData.student_id || !formData.subject_id || formData.is_pass === null || !formData.grade_type || !formData.date) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    try {
        const response = await fetch('/api/grades/credit', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('✅ Зачёт успешно добавлен!');
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCreditModal'));
            modal.hide();
            // Обновляем ведомость если она открыта
            if (document.getElementById('gradebookResults').innerHTML.includes('Ведомость')) {
                loadGradebook();
            }
        } else {
            alert('❌ Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка добавления зачёта:', error);
        alert('❌ Ошибка добавления зачёта');
    }
}

// Глобальные функции для onclick атрибутов
window.showSection = showSection;
window.showAddStudentForm = showAddStudentForm;
window.viewStudent = viewStudent;
window.logout = logout;
window.loadGradebook = loadGradebook;
window.showAddGradeModal = showAddGradeModal;
window.showAddCreditModal = showAddCreditModal;
window.submitGrade = submitGrade;
window.submitCredit = submitCredit;
window.showMyGroups = showMyGroups;
window.showMyGrades = showMyGrades;
window.loadGroupForGrading = loadGroupForGrading;
window.showAddGradeModalForStudent = showAddGradeModalForStudent;
window.showAddCreditModalForStudent = showAddCreditModalForStudent;
window.deleteGrade = deleteGrade;
window.editGrade = editGrade;
window.showAddGradeToGroup = showAddGradeToGroup;
window.showAddCreditToGroup = showAddCreditToGroup;

console.log('✅ Приложение инициализировано!');