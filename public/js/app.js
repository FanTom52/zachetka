// Проверяем, не объявлен ли уже класс GradebookApp
if (typeof GradebookApp === 'undefined') {

class GradebookApp {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация приложения...');
        
        // Проверяем авторизацию
        await this.checkAuthStatus();
        
        // Инициализируем обработчики
        this.initEventListeners();
        
        console.log('✅ Приложение инициализировано');
    }

    async checkAuthStatus() {
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedToken && savedUser) {
            this.authToken = savedToken;
            this.currentUser = JSON.parse(savedUser);
            this.showMainApp();
            return true;
        }
        return false;
    }

    initEventListeners() {
        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Навигация
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            }
            
            // Выход
            if (e.target.closest('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
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

            if (data.success) {
                this.authToken = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                this.showMainApp();
                this.showNotification('Успешный вход в систему', 'success');
            } else {
                this.showNotification(data.error || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    showMainApp() {
        document.getElementById('loginPage').classList.add('d-none');
        document.getElementById('mainApp').classList.remove('d-none');
        
        // Обновляем информацию о пользователе
        const userInfo = this.currentUser.name || this.currentUser.username;
        const role = this.currentUser.role;
        document.getElementById('userInfoSidebar').textContent = `${userInfo} (${role})`;
        
        // Скрываем элементы в зависимости от роли
        this.updateNavigationForRole();
        
        // Показываем панель управления
        this.showSection('dashboard');
    }

    updateNavigationForRole() {
        const role = this.currentUser.role;
        
        // Элементы для скрытия
        const elementsToHide = {
            student: ['studentsNavItem'],
            teacher: [],
            admin: []
        };

        // Скрываем элементы в зависимости от роли
        const elements = elementsToHide[role] || [];
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    async showSection(sectionName) {
        console.log(`📂 Переключаемся на раздел: ${sectionName}`);
        this.currentSection = sectionName;
        
        // Обновляем активный пункт меню
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Обновляем заголовок
        const titles = {
            dashboard: 'Панель управления',
            students: 'Управление студентами',
            grades: 'Журнал оценок',
            statistics: 'Статистика успеваемости',
            schedule: 'Расписание занятий',
            attendance: 'Посещаемость'
        };
        
        document.getElementById('pageTitle').textContent = titles[sectionName] || sectionName;

        // Загружаем контент раздела
        const content = document.getElementById('sectionsContent');
        content.innerHTML = this.getSectionLoader();

        try {
            let sectionHTML = '';
            
            switch(sectionName) {
                case 'dashboard':
                    sectionHTML = await this.loadDashboard();
                    break;
                case 'students':
                    sectionHTML = await this.loadStudentsSection();
                    break;
                case 'grades':
                    sectionHTML = await this.loadGradesSection();
                    break;
                case 'statistics':
                    sectionHTML = await this.loadStatisticsSection();
                    break;
                case 'schedule':
                    sectionHTML = await this.loadScheduleSection();
                    break;
                case 'attendance':
                    sectionHTML = await this.loadAttendanceSection();
                    break;
                default:
                    sectionHTML = this.getSectionNotImplemented(sectionName);
            }
            
            content.innerHTML = sectionHTML;
            
        } catch (error) {
            console.error(`Ошибка загрузки раздела ${sectionName}:`, error);
            content.innerHTML = this.getErrorContent('Ошибка загрузки раздела');
        }
    }

    getSectionLoader() {
        return `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px">
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                    <p>Загрузка...</p>
                </div>
            </div>
        `;
    }

    getErrorContent(message) {
        return `
            <div class="alert alert-danger">
                <h5>❌ Ошибка</h5>
                <p>${message}</p>
                <button class="btn btn-primary btn-sm" onclick="app.showSection('${this.currentSection}')">
                    Повторить
                </button>
            </div>
        `;
    }

    getSectionNotImplemented(sectionName) {
        return `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="fas fa-tools fa-3x text-muted mb-3"></i>
                    <h4>Раздел в разработке</h4>
                    <p class="text-muted">Функционал "${sectionName}" находится в стадии разработки.</p>
                </div>
            </div>
        `;
    }

    async loadDashboard() {
        try {
            const response = await this.apiRequest('/api/statistics/overview');
            
            if (response.success) {
                const stats = response.data;
                return this.renderDashboard(stats);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки дашборда:', error);
            return this.getErrorContent('Ошибка загрузки панели управления');
        }
    }

    renderDashboard(stats) {
        return `
            <div class="row">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card stat-card border-start border-primary border-4">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">Студенты</div>
                                    <div class="h5 mb-0 fw-bold text-gray-800">${stats.students || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-users fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card stat-card border-start border-success border-4">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs fw-bold text-success text-uppercase mb-1">Преподаватели</div>
                                    <div class="h5 mb-0 fw-bold text-gray-800">${stats.teachers || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-chalkboard-teacher fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card stat-card border-start border-info border-4">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs fw-bold text-info text-uppercase mb-1">Предметы</div>
                                    <div class="h5 mb-0 fw-bold text-gray-800">${stats.subjects || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-book fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card stat-card border-start border-warning border-4">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs fw-bold text-warning text-uppercase mb-1">Оценки</div>
                                    <div class="h5 mb-0 fw-bold text-gray-800">${stats.grades || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-star fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">🎯 Быстрый доступ</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary text-start" onclick="app.showSection('grades')">
                                    <i class="fas fa-book me-2"></i>Журнал оценок
                                </button>
                                ${this.currentUser.role !== 'student' ? `
                                    <button class="btn btn-outline-success text-start" onclick="app.showSection('students')">
                                        <i class="fas fa-users me-2"></i>Список студентов
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-info text-start" onclick="app.showSection('statistics')">
                                    <i class="fas fa-chart-bar me-2"></i>Статистика
                                </button>
                                <button class="btn btn-outline-warning text-start" onclick="app.showSection('schedule')">
                                    <i class="fas fa-calendar-alt me-2"></i>Расписание
                                </button>
                                <button class="btn btn-outline-secondary text-start" onclick="app.showSection('attendance')">
                                    <i class="fas fa-clipboard-check me-2"></i>Посещаемость
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 👥 Функционал администратора - управление студентами
    async loadStudentsSection() {
        if (this.currentUser.role === 'student') {
            return this.getErrorContent('Недостаточно прав для просмотра этого раздела');
        }

        try {
            const response = await this.apiRequest('/api/students');
            
            if (response.success) {
                return this.renderStudentsList(response.data.students);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки студентов:', error);
            return this.getErrorContent('Ошибка загрузки списка студентов');
        }
    }

    // 🎨 Рендер списка студентов с возможностью добавления
    renderStudentsList(students) {
        const canAddStudent = this.currentUser.role === 'admin';

        return `
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">👥 Управление студентами</h4>
                    ${canAddStudent ? `
                        <button class="btn btn-light btn-sm" onclick="app.showAddStudentForm()">
                            <i class="fas fa-plus"></i> Добавить студента
                        </button>
                    ` : ''}
                </div>
                <div class="card-body">
                    ${!students || students.length === 0 ? `
                        <div class="alert alert-info">
                            <h5>📝 Список студентов</h5>
                            <p class="mb-0">Студенты не найдены.</p>
                        </div>
                    ` : `
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>ФИО</th>
                                        <th>Группа</th>
                                        <th>Номер билета</th>
                                        <th>Email</th>
                                        <th>Телефон</th>
                                        ${canAddStudent ? `<th>Действия</th>` : ''}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${students.map(student => `
                                        <tr>
                                            <td>${student.name}</td>
                                            <td>${student.group_name || 'Не указана'}</td>
                                            <td><code>${student.student_card}</code></td>
                                            <td>${student.email || '<span class="text-muted">Не указан</span>'}</td>
                                            <td>${student.phone || '<span class="text-muted">Не указан</span>'}</td>
                                            ${canAddStudent ? `
                                                <td>
                                                    <button class="btn btn-sm btn-outline-warning" onclick="app.editStudent(${student.id})">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                </td>
                                            ` : ''}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ➕ Форма добавления студента (для администраторов)
    async showAddStudentForm() {
        try {
            const groupsResponse = await this.apiRequest('/api/groups');
            
            if (!groupsResponse.success) {
                this.showNotification('Ошибка загрузки групп', 'error');
                return;
            }

            const modalContent = `
                <form id="addStudentForm">
                    <div class="mb-3">
                        <label class="form-label">ФИО студента</label>
                        <input type="text" class="form-control" id="studentName" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Группа</label>
                        <select class="form-select" id="studentGroup" required>
                            <option value="">Выберите группу...</option>
                            ${(groupsResponse.data || []).map(group => 
                                `<option value="${group.id}">${group.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Номер студенческого билета</label>
                        <input type="text" class="form-control" id="studentCard" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="studentEmail">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Телефон</label>
                        <input type="tel" class="form-control" id="studentPhone">
                    </div>
                </form>
            `;

            // Создаем модальное окно
            const modalId = 'addStudentModal';
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'modal fade';
                modal.innerHTML = `
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Добавить студента</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="addStudentModalBody">
                                ${modalContent}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="app.addStudent()">Добавить</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                document.getElementById('addStudentModalBody').innerHTML = modalContent;
            }

            // Показываем модальное окно
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

        } catch (error) {
            console.error('Ошибка загрузки формы:', error);
            this.showNotification('Ошибка загрузки формы', 'error');
        }
    }

    // 💾 Добавление студента
    async addStudent() {
        const formData = {
            name: document.getElementById('studentName').value,
            group_id: document.getElementById('studentGroup').value,
            student_card: document.getElementById('studentCard').value,
            email: document.getElementById('studentEmail').value,
            phone: document.getElementById('studentPhone').value
        };

        // Валидация
        if (!formData.name || !formData.group_id || !formData.student_card) {
            this.showNotification('Заполните обязательные поля: ФИО, группа, номер билета', 'error');
            return;
        }

        try {
            const response = await this.apiRequest('/api/students', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                const modal = document.getElementById('addStudentModal');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) bsModal.hide();
                }
                // Обновляем список студентов
                this.showSection('students');
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка добавления студента:', error);
            this.showNotification('Ошибка добавления студента', 'error');
        }
    }

    // ✏️ Редактирование студента (заглушка)
    editStudent(studentId) {
        this.showNotification(`Редактирование студента ID: ${studentId} - функция в разработке`, 'info');
    }

    async loadGradesSection() {
        if (this.currentUser.role === 'student') {
            return await this.loadStudentGrades();
        } else if (this.currentUser.role === 'teacher' || this.currentUser.role === 'admin') {
            return await this.loadTeacherGrades();
        } else {
            return this.getSectionNotImplemented('Журнал оценок');
        }
    }

    // 📝 Загрузка раздела оценок для преподавателей
    async loadTeacherGrades() {
        try {
            // Загружаем группы и предметы
            const [groupsResponse, subjectsResponse] = await Promise.all([
                this.apiRequest('/api/groups'),
                this.apiRequest('/api/subjects')
            ]);

            if (!groupsResponse.success || !subjectsResponse.success) {
                return this.getErrorContent('Ошибка загрузки данных');
            }

            return `
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h4 class="mb-0">👨‍🏫 Журнал оценок</h4>
                    </div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <label class="form-label">Группа</label>
                                <select class="form-select" id="gradeGroupSelect">
                                    <option value="">Выберите группу...</option>
                                    ${(groupsResponse.data || []).map(group => 
                                        `<option value="${group.id}">${group.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Предмет</label>
                                <select class="form-select" id="gradeSubjectSelect">
                                    <option value="">Выберите предмет...</option>
                                    ${(subjectsResponse.data || []).map(subject => 
                                        `<option value="${subject.id}">${subject.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">&nbsp;</label>
                                <button class="btn btn-primary w-100" onclick="app.loadGradebook()">
                                    <i class="fas fa-search"></i> Показать ведомость
                                </button>
                            </div>
                        </div>
                        
                        <div id="gradebookResults">
                            <div class="alert alert-info">
                                <h6>📋 Инструкция:</h6>
                                <p class="mb-0">Выберите группу и предмет для просмотра ведомости успеваемости.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки журнала:', error);
            return this.getErrorContent('Ошибка загрузки журнала');
        }
    }

    // 📊 Загрузка ведомости
    async loadGradebook() {
        const groupId = document.getElementById('gradeGroupSelect')?.value;
        const subjectId = document.getElementById('gradeSubjectSelect')?.value;
        
        if (!groupId || !subjectId) {
            this.showNotification('Пожалуйста, выберите группу и предмет', 'error');
            return;
        }
        
        const resultsDiv = document.getElementById('gradebookResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = this.getSectionLoader();

        try {
            const response = await this.apiRequest(`/api/grades/gradebook/${groupId}/${subjectId}`);
            
            if (response.success) {
                resultsDiv.innerHTML = this.renderGradebook(response.data);
            } else {
                resultsDiv.innerHTML = this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки ведомости:', error);
            resultsDiv.innerHTML = this.getErrorContent('Ошибка загрузки ведомости');
        }
    }

    // 🎨 Рендер ведомости
    renderGradebook(data) {
        if (!data || !data.students) {
            return this.getErrorContent('Нет данных для отображения');
        }

        const { group, subject, students } = data;

        return `
            <div class="card">
                <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Ведомость: ${group || 'Группа'} - ${subject || 'Предмет'}</h5>
                    <button class="btn btn-light btn-sm" onclick="app.exportGradebook()">
                        <i class="fas fa-download"></i> Экспорт
                    </button>
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
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => `
                                    <tr>
                                        <td>${student.student_name || 'Не указан'}</td>
                                        <td><code>${student.student_card || '—'}</code></td>
                                        <td>
                                            ${student.grade ? `
                                                <span class="badge ${this.getGradeBadgeClass(student.grade)}">
                                                    ${student.grade}
                                                </span>
                                            ` : '<span class="text-muted">—</span>'}
                                        </td>
                                        <td>${student.grade_type ? this.getGradeTypeText(student.grade_type) : '—'}</td>
                                        <td>${student.date ? new Date(student.date).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary" 
                                                    onclick="app.showGradeModal(${student.student_id || student.id}, ${student.grade || 'null'}, '${student.grade_type || ''}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
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

    // 📝 Модальное окно для выставления оценки
    showGradeModal(studentId, currentGrade, gradeType) {
        const subjectId = document.getElementById('gradeSubjectSelect')?.value;
        if (!subjectId) {
            this.showNotification('Сначала выберите предмет', 'error');
            return;
        }
        
        const modalContent = `
            <form id="gradeForm">
                <div class="mb-3">
                    <label class="form-label">Оценка</label>
                    <select class="form-select" id="gradeValue" required>
                        <option value="">Выберите оценку</option>
                        <option value="5" ${currentGrade === 5 ? 'selected' : ''}>5 - Отлично</option>
                        <option value="4" ${currentGrade === 4 ? 'selected' : ''}>4 - Хорошо</option>
                        <option value="3" ${currentGrade === 3 ? 'selected' : ''}>3 - Удовлетворительно</option>
                        <option value="2" ${currentGrade === 2 ? 'selected' : ''}>2 - Неудовлетворительно</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Тип работы</label>
                    <select class="form-select" id="gradeType" required>
                        <option value="">Выберите тип</option>
                        <option value="exam" ${gradeType === 'exam' ? 'selected' : ''}>Экзамен</option>
                        <option value="test" ${gradeType === 'test' ? 'selected' : ''}>Зачёт</option>
                        <option value="coursework" ${gradeType === 'coursework' ? 'selected' : ''}>Курсовая</option>
                        <option value="practice" ${gradeType === 'practice' ? 'selected' : ''}>Практика</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-control" id="gradeDate" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <input type="hidden" id="gradeStudentId" value="${studentId}">
                <input type="hidden" id="gradeSubjectId" value="${subjectId}">
            </form>
        `;

        // Создаем модальное окно
        const modalId = 'gradeModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${currentGrade ? 'Редактировать оценку' : 'Выставить оценку'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="gradeModalBody">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveGrade()">Сохранить</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            document.getElementById('gradeModalBody').innerHTML = modalContent;
        }

        // Показываем модальное окно
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    // 💾 Сохранение оценки
    async saveGrade() {
        const formData = {
            student_id: document.getElementById('gradeStudentId')?.value,
            subject_id: document.getElementById('gradeSubjectId')?.value,
            grade: parseInt(document.getElementById('gradeValue')?.value),
            grade_type: document.getElementById('gradeType')?.value,
            date: document.getElementById('gradeDate')?.value
        };

        // Валидация
        if (!formData.student_id || !formData.subject_id || !formData.grade || !formData.grade_type || !formData.date) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const response = await this.apiRequest('/api/grades', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                const modal = document.getElementById('gradeModal');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) bsModal.hide();
                }
                // Обновляем ведомость
                this.loadGradebook();
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения оценки:', error);
            this.showNotification('Ошибка сохранения оценки', 'error');
        }
    }

    async loadStudentGrades() {
        try {
            const studentId = this.currentUser.student_id || this.currentUser.id;
            const response = await this.apiRequest(`/api/grades/student/${studentId}`);
            
            if (response.success) {
                return this.renderStudentGrades(response.data);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки оценок:', error);
            return this.getErrorContent('Ошибка загрузки оценок');
        }
    }

    renderStudentGrades(grades) {
        if (!grades || grades.length === 0) {
            return `
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">📚 Мои оценки</h4>
                    </div>
                    <div class="card-body text-center py-5">
                        <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                        <h5>Оценок пока нет</h5>
                        <p class="text-muted">Ваши оценки появятся здесь после того, как преподаватели их выставят.</p>
                    </div>
                </div>
            `;
        }

        const validGrades = grades.filter(grade => grade && typeof grade.grade === 'number');
        const averageGrade = validGrades.length > 0 
            ? (validGrades.reduce((sum, grade) => sum + grade.grade, 0) / validGrades.length).toFixed(2)
            : '0.00';

        return `
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">📚 Мои оценки</h4>
                    <span class="badge bg-light text-dark fs-6">
                        Средний балл: <strong>${averageGrade}</strong>
                    </span>
                </div>
                <div class="card-body">
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
                                ${grades.map(grade => grade ? `
                                    <tr>
                                        <td>${grade.subject_name || 'Не указан'}</td>
                                        <td>
                                            <span class="badge ${this.getGradeBadgeClass(grade.grade)}">
                                                ${grade.grade}
                                            </span>
                                        </td>
                                        <td>${this.getGradeTypeText(grade.grade_type)}</td>
                                        <td>${grade.date ? new Date(grade.date).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td>${grade.teacher_name || '—'}</td>
                                    </tr>
                                ` : '').join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadStatisticsSection() {
        try {
            // Загружаем все данные статистики
            const [groupsStats, subjectsStats, gradesDistribution, monthlyStats] = await Promise.all([
                this.apiRequest('/api/statistics/groups'),
                this.apiRequest('/api/statistics/subjects'),
                this.apiRequest('/api/statistics/grades-distribution'),
                this.apiRequest('/api/statistics/monthly')
            ]);

            if (!groupsStats.success || !subjectsStats.success || !gradesDistribution.success || !monthlyStats.success) {
                return this.getErrorContent('Ошибка загрузки статистики');
            }

            return this.renderStatistics(
                groupsStats.data || [],
                subjectsStats.data || [],
                gradesDistribution.data || [],
                monthlyStats.data || []
            );

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            return this.getErrorContent('Ошибка загрузки статистики');
        }
    }

    // 📊 Рендер статистики
    renderStatistics(groupsStats, subjectsStats, gradesDistribution, monthlyStats) {
        return `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h4 class="mb-0">📊 Статистика успеваемости</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <!-- Статистика по группам -->
                        <div class="col-md-6">
                            <h5>📈 Успеваемость по группам</h5>
                            ${groupsStats.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Группа</th>
                                                <th>Средний балл</th>
                                                <th>Студентов</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${groupsStats.map(group => `
                                                <tr>
                                                    <td>${group.group_name}</td>
                                                    <td>
                                                        <span class="badge ${this.getGradeBadgeClass(Math.round(group.average_grade))}">
                                                            ${group.average_grade ? group.average_grade.toFixed(2) : '0.00'}
                                                        </span>
                                                    </td>
                                                    <td>${group.student_count}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p class="text-muted">Нет данных по группам</p>'}
                        </div>

                        <!-- Распределение оценок -->
                        <div class="col-md-6">
                            <h5>📊 Распределение оценок</h5>
                            ${gradesDistribution.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Оценка</th>
                                                <th>Количество</th>
                                                <th>Процент</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${gradesDistribution.map(grade => `
                                                <tr>
                                                    <td>
                                                        <span class="badge ${this.getGradeBadgeClass(grade.grade)}">
                                                            ${grade.grade}
                                                        </span>
                                                    </td>
                                                    <td>${grade.count}</td>
                                                    <td>${grade.percentage ? grade.percentage.toFixed(1) + '%' : '0%'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p class="text-muted">Нет данных по оценкам</p>'}
                        </div>
                    </div>

                    <div class="row mt-4">
                        <!-- Статистика по предметам -->
                        <div class="col-12">
                            <h5>📚 Успеваемость по предметам</h5>
                            ${subjectsStats.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Предмет</th>
                                                <th>Средний балл</th>
                                                <th>Количество оценок</th>
                                                <th>Преподаватель</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${subjectsStats.map(subject => `
                                                <tr>
                                                    <td>${subject.subject_name}</td>
                                                    <td>
                                                        <span class="badge ${this.getGradeBadgeClass(Math.round(subject.average_grade))}">
                                                            ${subject.average_grade ? subject.average_grade.toFixed(2) : '0.00'}
                                                        </span>
                                                    </td>
                                                    <td>${subject.grade_count}</td>
                                                    <td>${subject.teacher_name || 'Не назначен'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p class="text-muted">Нет данных по предметам</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 📅 Загрузка раздела расписания
    async loadScheduleSection() {
        try {
            if (this.currentUser.role === 'student') {
                return await this.loadStudentSchedule();
            } else {
                return await this.loadTeacherSchedule();
            }
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            return this.getErrorContent('Ошибка загрузки расписания');
        }
    }

    // 🎓 Расписание для студента
    async loadStudentSchedule() {
        try {
            const studentId = this.currentUser.student_id || this.currentUser.id;
            const response = await this.apiRequest(`/api/schedule/student/${studentId}`);
            
            if (response.success) {
                return this.renderStudentSchedule(response.data);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки расписания студента:', error);
            return this.getErrorContent('Ошибка загрузки расписания');
        }
    }

    // 🎨 Рендер расписания студента
    renderStudentSchedule(scheduleData) {
        if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
            return `
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h4 class="mb-0">📅 Мое расписание</h4>
                    </div>
                    <div class="card-body text-center py-5">
                        <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                        <h5>Расписание не найдено</h5>
                        <p class="text-muted">Расписание для вашей группы пока не составлено.</p>
                    </div>
                </div>
            `;
        }

        const { student, schedule } = scheduleData;
        const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

        return `
            <div class="card">
                <div class="card-header bg-info text-white">
                    <h4 class="mb-0">📅 Мое расписание</h4>
                </div>
                <div class="card-body">
                    <div class="alert alert-primary mb-4">
                        <h6>👤 Студент: <strong>${student.name}</strong></h6>
                        <p class="mb-0">🎓 Группа: <strong>${student.group_name}</strong></p>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>День недели</th>
                                    <th>Время</th>
                                    <th>Предмет</th>
                                    <th>Преподаватель</th>
                                    <th>Аудитория</th>
                                    <th>Тип занятия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schedule.map(lesson => `
                                    <tr>
                                        <td><strong>${daysOfWeek[lesson.day_of_week - 1] || lesson.day_of_week}</strong></td>
                                        <td>${lesson.start_time} - ${lesson.end_time}</td>
                                        <td>${lesson.subject_name}</td>
                                        <td>${lesson.teacher_name}</td>
                                        <td><code>${lesson.classroom || '—'}</code></td>
                                        <td>
                                            <span class="badge ${this.getLessonTypeBadge(lesson.lesson_type)}">
                                                ${this.getLessonTypeText(lesson.lesson_type)}
                                            </span>
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

    // 👨‍🏫 Расписание для преподавателя
    async loadTeacherSchedule() {
        try {
            const teacherId = this.currentUser.teacher_id || this.currentUser.id;
            const response = await this.apiRequest(`/api/schedule/teacher/${teacherId}`);
            
            if (response.success) {
                return this.renderTeacherSchedule(response.data);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки расписания преподавателя:', error);
            return this.getErrorContent('Ошибка загрузки расписания');
        }
    }

    // 🎨 Рендер расписания преподавателя
    renderTeacherSchedule(schedule) {
        if (!schedule || schedule.length === 0) {
            return `
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h4 class="mb-0">📅 Мое расписание</h4>
                    </div>
                    <div class="card-body text-center py-5">
                        <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                        <h5>Расписание не найдено</h5>
                        <p class="text-muted">У вас пока нет занятий в расписании.</p>
                    </div>
                </div>
            `;
        }

        const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

        return `
            <div class="card">
                <div class="card-header bg-info text-white">
                    <h4 class="mb-0">📅 Мое расписание</h4>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>День недели</th>
                                    <th>Время</th>
                                    <th>Предмет</th>
                                    <th>Группа</th>
                                    <th>Аудитория</th>
                                    <th>Тип занятия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schedule.map(lesson => `
                                    <tr>
                                        <td><strong>${daysOfWeek[lesson.day_of_week - 1] || lesson.day_of_week}</strong></td>
                                        <td>${lesson.start_time} - ${lesson.end_time}</td>
                                        <td>${lesson.subject_name}</td>
                                        <td>${lesson.group_name}</td>
                                        <td><code>${lesson.classroom || '—'}</code></td>
                                        <td>
                                            <span class="badge ${this.getLessonTypeBadge(lesson.lesson_type)}">
                                                ${this.getLessonTypeText(lesson.lesson_type)}
                                            </span>
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

    // 📊 Загрузка раздела посещаемости
    async loadAttendanceSection() {
        try {
            if (this.currentUser.role === 'student') {
                return await this.loadStudentAttendance();
            } else {
                return await this.loadTeacherAttendance();
            }
        } catch (error) {
            console.error('Ошибка загрузки посещаемости:', error);
            return this.getErrorContent('Ошибка загрузки посещаемости');
        }
    }

    // 🎓 Посещаемость для студента
    async loadStudentAttendance() {
        try {
            const studentId = this.currentUser.student_id || this.currentUser.id;
            const response = await this.apiRequest(`/api/attendance/student/${studentId}`);
            
            if (response.success) {
                return this.renderStudentAttendance(response.data);
            } else {
                return this.getErrorContent(response.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки посещаемости:', error);
            return this.getErrorContent('Ошибка загрузки посещаемости');
        }
    }

    // 🎨 Рендер посещаемости студента
    renderStudentAttendance(attendanceData) {
        if (!attendanceData || !attendanceData.attendance || attendanceData.attendance.length === 0) {
            return `
                <div class="card">
                    <div class="card-header bg-warning text-white">
                        <h4 class="mb-0">📝 Моя посещаемость</h4>
                    </div>
                    <div class="card-body text-center py-5">
                        <i class="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                        <h5>Данные о посещаемости отсутствуют</h5>
                        <p class="text-muted">Информация о посещаемости появится после отметок преподавателей.</p>
                    </div>
                </div>
            `;
        }

        const { student, attendance } = attendanceData;
        const stats = this.calculateAttendanceStats(attendance);

        return `
            <div class="card">
                <div class="card-header bg-warning text-white">
                    <h4 class="mb-0">📝 Моя посещаемость</h4>
                </div>
                <div class="card-body">
                    <div class="alert alert-primary mb-4">
                        <h6>👤 Студент: <strong>${student.name}</strong></h6>
                        <p class="mb-0">🎓 Группа: <strong>${student.group_name}</strong></p>
                    </div>

                    <!-- Статистика -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center py-3">
                                    <h6>Присутствовал</h6>
                                    <h3>${stats.present}</h3>
                                    <small>${stats.presentPercentage}%</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-danger text-white">
                                <div class="card-body text-center py-3">
                                    <h6>Отсутствовал</h6>
                                    <h3>${stats.absent}</h3>
                                    <small>${stats.absentPercentage}%</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center py-3">
                                    <h6>Опоздал</h6>
                                    <h3>${stats.late}</h3>
                                    <small>${stats.latePercentage}%</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body text-center py-3">
                                    <h6>Болел</h6>
                                    <h3>${stats.sick}</h3>
                                    <small>${stats.sickPercentage}%</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Детальная таблица -->
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Предмет</th>
                                    <th>Преподаватель</th>
                                    <th>Статус</th>
                                    <th>Примечания</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attendance.map(record => `
                                    <tr>
                                        <td>${new Date(record.date).toLocaleDateString('ru-RU')}</td>
                                        <td>
                                            <strong>${record.subject_name}</strong>
                                            <br><small class="text-muted">${record.classroom || ''}</small>
                                        </td>
                                        <td>${record.teacher_name}</td>
                                        <td>
                                            <span class="badge ${this.getAttendanceBadgeClass(record.status)}">
                                                ${this.getAttendanceStatusText(record.status)}
                                            </span>
                                        </td>
                                        <td>${record.notes || '<span class="text-muted">—</span>'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 👨‍🏫 Посещаемость для преподавателя
    async loadTeacherAttendance() {
        try {
            // Загружаем группы и предметы преподавателя
            const [groupsResponse, subjectsResponse] = await Promise.all([
                this.apiRequest('/api/groups'),
                this.apiRequest('/api/subjects')
            ]);

            if (!groupsResponse.success || !subjectsResponse.success) {
                return this.getErrorContent('Ошибка загрузки данных');
            }

            return `
                <div class="card">
                    <div class="card-header bg-warning text-white">
                        <h4 class="mb-0">📝 Учет посещаемости</h4>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <h6>👨‍🏫 Режим преподавателя</h6>
                            <p class="mb-0">Отмечайте посещаемость студентов по группам и предметам.</p>
                        </div>

                        <div class="row mb-4">
                            <div class="col-md-3">
                                <label class="form-label">Группа</label>
                                <select class="form-select" id="attendanceGroupSelect">
                                    <option value="">Выберите группу...</option>
                                    ${(groupsResponse.data || []).map(group => 
                                        `<option value="${group.id}">${group.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Предмет</label>
                                <select class="form-select" id="attendanceSubjectSelect">
                                    <option value="">Выберите предмет...</option>
                                    ${(subjectsResponse.data || []).map(subject => 
                                        `<option value="${subject.id}">${subject.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Дата</label>
                                <input type="date" class="form-control" id="attendanceDate" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">&nbsp;</label>
                                <button class="btn btn-primary w-100" onclick="app.loadAttendanceForm()">
                                    <i class="fas fa-search"></i> Загрузить список
                                </button>
                            </div>
                        </div>
                        
                        <div id="attendanceFormContainer">
                            <div class="alert alert-info">
                                <h6>📋 Инструкция:</h6>
                                <p class="mb-0">Выберите группу, предмет и дату для отметки посещаемости.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки посещаемости:', error);
            return this.getErrorContent('Ошибка загрузки посещаемости');
        }
    }

    // 📋 Загрузка формы посещаемости
    async loadAttendanceForm() {
        const groupId = document.getElementById('attendanceGroupSelect').value;
        const subjectId = document.getElementById('attendanceSubjectSelect').value;
        const date = document.getElementById('attendanceDate').value;
        
        if (!groupId || !subjectId || !date) {
            this.showNotification('Пожалуйста, выберите группу, предмет и дату', 'error');
            return;
        }

        const container = document.getElementById('attendanceFormContainer');
        container.innerHTML = this.getSectionLoader();

        try {
            // Загружаем студентов группы
            const studentsResponse = await this.apiRequest(`/api/groups/${groupId}/students`);
            
            if (!studentsResponse.success) {
                container.innerHTML = this.getErrorContent('Ошибка загрузки студентов');
                return;
            }

            // Загружаем существующую посещаемость
            const attendanceResponse = await this.apiRequest(`/api/attendance/${date}/${groupId}/${subjectId}`);
            const existingAttendance = attendanceResponse.success ? attendanceResponse.data : [];

            // Создаем форму
            container.innerHTML = this.renderAttendanceForm(
                studentsResponse.data, 
                existingAttendance,
                groupId,
                subjectId,
                date
            );

        } catch (error) {
            console.error('Ошибка загрузки формы:', error);
            container.innerHTML = this.getErrorContent('Ошибка загрузки формы');
        }
    }

    // 🎨 Рендер формы посещаемости
    renderAttendanceForm(students, existingAttendance, groupId, subjectId, date) {
        if (!students || students.length === 0) {
            return '<div class="alert alert-warning">В выбранной группе нет студентов</div>';
        }

        // Создаем карту существующей посещаемости для быстрого доступа
        const attendanceMap = {};
        existingAttendance.forEach(record => {
            attendanceMap[record.student_id] = record;
        });

        return `
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">📝 Отметка посещаемости</h5>
                </div>
                <div class="card-body">
                    <form id="attendanceForm">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Студент</th>
                                        <th>Номер билета</th>
                                        <th>Статус</th>
                                        <th>Примечания</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${students.map(student => {
                                        const existingRecord = attendanceMap[student.id];
                                        return `
                                            <tr>
                                                <td>
                                                    <strong>${student.name}</strong>
                                                    <input type="hidden" name="student_id[]" value="${student.id}">
                                                </td>
                                                <td><code>${student.student_card}</code></td>
                                                <td>
                                                    <select class="form-select form-select-sm" name="status[]" required>
                                                        <option value="present" ${existingRecord?.status === 'present' ? 'selected' : ''}>Присутствовал</option>
                                                        <option value="absent" ${existingRecord?.status === 'absent' ? 'selected' : ''}>Отсутствовал</option>
                                                        <option value="late" ${existingRecord?.status === 'late' ? 'selected' : ''}>Опоздал</option>
                                                        <option value="sick" ${existingRecord?.status === 'sick' ? 'selected' : ''}>Болел</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="text" class="form-control form-control-sm" name="notes[]" 
                                                           placeholder="Примечание" value="${existingRecord?.notes || ''}">
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="mt-3">
                            <button type="button" class="btn btn-success" onclick="app.saveAttendance()">
                                <i class="fas fa-save"></i> Сохранить посещаемость
                            </button>
                            <button type="button" class="btn btn-secondary ms-2" onclick="app.loadAttendanceForm()">
                                <i class="fas fa-sync"></i> Обновить
                            </button>
                        </div>
                        
                        <input type="hidden" id="attendanceGroupId" value="${groupId}">
                        <input type="hidden" id="attendanceSubjectId" value="${subjectId}">
                        <input type="hidden" id="attendanceDateValue" value="${date}">
                    </form>
                </div>
            </div>
        `;
    }

    // 💾 Сохранение посещаемости
    async saveAttendance() {
        const groupId = document.getElementById('attendanceGroupId').value;
        const subjectId = document.getElementById('attendanceSubjectId').value;
        const date = document.getElementById('attendanceDateValue').value;
        
        const form = document.getElementById('attendanceForm');
        const studentIds = Array.from(form.querySelectorAll('input[name="student_id[]"]')).map(input => input.value);
        const statuses = Array.from(form.querySelectorAll('select[name="status[]"]')).map(select => select.value);
        const notes = Array.from(form.querySelectorAll('input[name="notes[]"]')).map(input => input.value);

        const attendance_records = studentIds.map((studentId, index) => ({
            student_id: parseInt(studentId),
            status: statuses[index],
            notes: notes[index]
        }));

        const formData = {
            date,
            subject_id: parseInt(subjectId),
            group_id: parseInt(groupId),
            attendance_records
        };

        try {
            const response = await this.apiRequest('/api/attendance', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                // Обновляем форму
                this.loadAttendanceForm();
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения посещаемости:', error);
            this.showNotification('Ошибка сохранения посещаемости', 'error');
        }
    }

    // 🎨 Вспомогательные методы для стилизации
    getGradeBadgeClass(grade) {
        if (grade >= 4.5) return 'bg-success';
        if (grade >= 3.5) return 'bg-primary';
        if (grade >= 2.5) return 'bg-warning';
        return 'bg-danger';
    }

    getGradeTypeText(type) {
        const types = {
            'exam': 'Экзамен',
            'test': 'Зачёт',
            'coursework': 'Курсовая',
            'practice': 'Практика'
        };
        return types[type] || type;
    }

    // 🎨 Классы для типов занятий
    getLessonTypeBadge(type) {
        const badges = {
            'lecture': 'bg-primary',
            'practice': 'bg-success',
            'lab': 'bg-info',
            'seminar': 'bg-warning'
        };
        return badges[type] || 'bg-secondary';
    }

    getLessonTypeText(type) {
        const types = {
            'lecture': 'Лекция',
            'practice': 'Практика',
            'lab': 'Лабораторная',
            'seminar': 'Семинар'
        };
        return types[type] || type;
    }

    // 🎨 Классы для статусов посещаемости
    getAttendanceBadgeClass(status) {
        const badges = {
            'present': 'bg-success',
            'absent': 'bg-danger',
            'late': 'bg-warning',
            'sick': 'bg-info'
        };
        return badges[status] || 'bg-secondary';
    }

    getAttendanceStatusText(status) {
        const statuses = {
            'present': 'Присутствовал',
            'absent': 'Отсутствовал',
            'late': 'Опоздал',
            'sick': 'Болел'
        };
        return statuses[status] || status;
    }

    // 📊 Расчет статистики посещаемости
    calculateAttendanceStats(attendance) {
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const sick = attendance.filter(a => a.status === 'sick').length;

        return {
            present,
            absent,
            late,
            sick,
            total,
            presentPercentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0',
            absentPercentage: total > 0 ? ((absent / total) * 100).toFixed(1) : '0.0',
            latePercentage: total > 0 ? ((late / total) * 100).toFixed(1) : '0.0',
            sickPercentage: total > 0 ? ((sick / total) * 100).toFixed(1) : '0.0'
        };
    }

    // 📤 Экспорт ведомости (заглушка)
    exportGradebook() {
        this.showNotification('Функция экспорта будет реализована в следующем обновлении', 'info');
    }

    async apiRequest(endpoint, options = {}) {
        const url = endpoint;
        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const config = {
            method: options.method || 'GET',
            headers: headers,
            ...options
        };

        if (options.body) {
            config.body = options.body;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.logout();
                throw new Error('Требуется повторная авторизация');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // 🔔 Уведомления
    showNotification(message, type = 'info') {
        // Создаем контейнер для уведомлений если его нет
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        const alertClass = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        }[type] || 'alert-info';

        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show`;
        notification.innerHTML = `
            ${icon} ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(notification);

        // Автоматическое скрытие
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        this.authToken = null;
        this.currentUser = null;
        
        document.getElementById('loginPage').classList.remove('d-none');
        document.getElementById('mainApp').classList.add('d-none');
        
        this.showNotification('Вы вышли из системы', 'info');
    }
}

// Добавим функции для экспорта в PDF
function exportStudentToPDF(studentId) {
    const url = `/api/statistics/student/${studentId}/pdf`;
    window.open(url, '_blank');
}

function exportGroupToPDF(groupId) {
    const url = `/api/statistics/group/${groupId}/pdf`;
    window.open(url, '_blank');
}

// Обновим HTML отчеты, добавив кнопки PDF
function enhanceReportButtons() {
    // Находим все кнопки отчетов и добавляем PDF экспорт
    document.querySelectorAll('.report-actions').forEach(container => {
        const studentId = container.dataset.studentId;
        const groupId = container.dataset.groupId;
        
        if (studentId) {
            const pdfBtn = document.createElement('button');
            pdfBtn.className = 'btn btn-pdf';
            pdfBtn.innerHTML = '📄 Экспорт в PDF';
            pdfBtn.onclick = () => exportStudentToPDF(studentId);
            container.appendChild(pdfBtn);
        }
        
        if (groupId) {
            const pdfBtn = document.createElement('button');
            pdfBtn.className = 'btn btn-pdf';
            pdfBtn.innerHTML = '📄 Экспорт в PDF';
            pdfBtn.onclick = () => exportGroupToPDF(groupId);
            container.appendChild(pdfBtn);
        }
    });
}

// Вызываем при загрузке страницы
document.addEventListener('DOMContentLoaded', enhanceReportButtons);

// 🎯 Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', function() {
    app = new GradebookApp();
    
    // Глобальные функции
    window.app = app;
    window.logout = () => app.logout();
    window.toggleTheme = () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };
    
    // Загрузка темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
});

console.log('✅ Приложение загружено');

} // Конец проверки typeof GradebookApp === 'undefined'