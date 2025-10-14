const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('./database');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
    console.error('❌ ОШИБКА: Нужно установить JWT_SECRET в файле .env');
    console.error('💡 Добавьте в файл .env строку: JWT_SECRET=ваш_секретный_ключ');
    process.exit(1); // Останавливаем программу
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Требуется авторизация' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Недействительный токен' 
            });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки токена из query параметра или headers
const authenticateTokenFromQuery = (req, res, next) => {
    // Пробуем получить токен из query параметра
    const tokenFromQuery = req.query.token;
    
    // Пробуем получить токен из headers
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1];

    const token = tokenFromQuery || tokenFromHeader;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Требуется авторизация' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Недействительный токен' 
            });
        }
        req.user = user;
        next();
    });
};

// 📍 Маршруты аутентификации
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // ⭐⭐⭐ ПРОВЕРКА ДАННЫХ (ИСПРАВЛЕННАЯ) ⭐⭐⭐
        // Проверяем, что все поля заполнены
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Логин и пароль обязательны'
            });
        }

        // Проверяем длину логина
        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Логин должен быть не менее 3 символов'
            });
        }

        // Проверяем длину пароля
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Пароль должен быть не менее 6 символов'
            });
        }
        // ⭐⭐⭐ КОНЕЦ ПРОВЕРКИ ⭐⭐⭐

        // Остальной код оставляем без изменений
        const users = await database.query(
            `SELECT u.*, 
                    s.id as student_id, s.group_id,
                    t.id as teacher_id
             FROM users u
             LEFT JOIN students s ON u.student_id = s.id
             LEFT JOIN teachers t ON u.teacher_id = t.id
             WHERE u.username = ?`, 
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Неверный логин или пароль'
            });
        }

        const user = users[0];

        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Неверный логин или пароль'
            });
        }

        // Создание JWT токена
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                student_id: user.student_id,
                teacher_id: user.teacher_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Создаем объект пользователя без пароля и без name
        const userResponse = {
            id: user.id,
            username: user.username,
            role: user.role,
            student_id: user.student_id,
            teacher_id: user.teacher_id
            // убрали name
        };

        res.json({
            success: true,
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при авторизации'
        });
    }
});

// 📍 Регистрация нового пользователя (только для админов)
app.post('/api/auth/register', authenticateToken, async (req, res) => {
    try {
        // ⭐⭐⭐ ПРОВЕРКА ПРАВ АДМИНА ⭐⭐⭐
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Только администратор может регистрировать новых пользователей'
            });
        }

        const { username, password, role, student_card, group_id } = req.body;

        // Проверяем, что все обязательные поля заполнены
        if (!username || !password || !role) {
            return res.status(400).json({
                success: false,
                error: 'Логин, пароль и роль обязательны'
            });
        }

        // Проверяем длину логина
        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Логин должен быть не менее 3 символов'
            });
        }

        // Проверяем длину пароля
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Пароль должен быть не менее 6 символов'
            });
        }

        // Проверяем, что роль правильная
        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Роль должна быть "student", "teacher" или "admin"'
            });
        }

        // Проверяем, нет ли уже пользователя с таким логином
        const existingUsers = await database.query(
            'SELECT id FROM users WHERE username = ?', 
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Пользователь с таким логином уже существует'
            });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        let student_id = null;
        let teacher_id = null;

        // Если регистрируется студент - создаем запись в students
        if (role === 'student') {
            if (!student_card) {
                return res.status(400).json({
                    success: false,
                    error: 'Для студента обязателен номер зачетки'
                });
            }

            const studentResult = await database.run(
                `INSERT INTO students (name, student_card, group_id) 
                 VALUES (?, ?, ?)`,
                [username, student_card, group_id || null] // Используем username как имя
            );
            student_id = studentResult.insertId;
        }

        // Если регистрируется преподаватель - создаем запись в teachers
        if (role === 'teacher') {
            const teacherResult = await database.run(
                `INSERT INTO teachers (name) 
                 VALUES (?)`,
                [username] // Используем username как имя
            );
            teacher_id = teacherResult.insertId;
        }

        // Создаем пользователя (БЕЗ колонки name)
        await database.run(
            `INSERT INTO users (username, password, role, student_id, teacher_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, role, student_id, teacher_id]
        );

        res.json({
            success: true,
            message: 'Пользователь успешно зарегистрирован!'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка регистрации пользователя'
        });
    }
});

// 📍 Получение текущего пользователя
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const users = await database.query(
            `SELECT u.*, 
                    s.id as student_id, s.group_id,
                    t.id as teacher_id
             FROM users u
             LEFT JOIN students s ON u.student_id = s.id
             LEFT JOIN teachers t ON u.teacher_id = t.id
             WHERE u.id = ?`, 
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        const user = users[0];
        const userResponse = {
            id: user.id,
            username: user.username,
            role: user.role,
            student_id: user.student_id,
            teacher_id: user.teacher_id
            // убрали name
        };

        res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

// 📍 Получение списка всех пользователей (только для админов)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        // Проверяем права админа
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const users = await database.query(`
            SELECT u.*, 
                   s.student_card,
                   s.name as student_name,
                   g.name as group_name
            FROM users u
            LEFT JOIN students s ON u.student_id = s.id
            LEFT JOIN groups g ON s.group_id = g.id
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки пользователей'
        });
    }
});

// 📍 Маршруты студентов
app.get('/api/students', authenticateToken, async (req, res) => {
    try {
        const students = await database.query(`
            SELECT s.*, g.name as group_name 
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id
        `);
        
        res.json({
            success: true,
            data: { students }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки студентов'
        });
    }
});

// 📍 Добавление студента
app.post('/api/students', authenticateToken, async (req, res) => {
    try {
        const { name, group_id, student_card, email, phone } = req.body;

        if (!name || !group_id || !student_card) {
            return res.status(400).json({
                success: false,
                error: 'ФИО, группа и номер билета обязательны'
            });
        }

        const result = await database.run(
            `INSERT INTO students (name, group_id, student_card, email, phone) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, group_id, student_card, email, phone]
        );

        res.json({
            success: true,
            message: 'Студент успешно добавлен',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка добавления студента'
        });
    }
});

// 📍 Маршруты групп
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const groups = await database.query('SELECT * FROM groups');
        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки групп'
        });
    }
});

// 📍 Маршруты предметов
app.get('/api/subjects', authenticateToken, async (req, res) => {
    try {
        const subjects = await database.query('SELECT * FROM subjects');
        res.json({
            success: true,
            data: subjects
        });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки предметов'
        });
    }
});

// 📍 Оценки студента
app.get('/api/grades/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const grades = await database.query(`
            SELECT g.*, s.name as subject_name, t.name as teacher_name
            FROM grades g
            LEFT JOIN subjects s ON g.subject_id = s.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            WHERE g.student_id = ?
            ORDER BY g.date DESC
        `, [studentId]);

        res.json({
            success: true,
            data: grades
        });
    } catch (error) {
        console.error('Get student grades error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки оценок'
        });
    }
});

// 📍 Ведомость группы по предмету
app.get('/api/grades/gradebook/:groupId/:subjectId', authenticateToken, async (req, res) => {
    try {
        const { groupId, subjectId } = req.params;
        
        const students = await database.query(`
            SELECT s.id as student_id, s.name as student_name, s.student_card,
                   g.grade, g.grade_type, g.date
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ?
            WHERE s.group_id = ?
            ORDER BY s.name
        `, [subjectId, groupId]);

        // Получаем названия группы и предмета
        const group = await database.query('SELECT name FROM groups WHERE id = ?', [groupId]);
        const subject = await database.query('SELECT name FROM subjects WHERE id = ?', [subjectId]);

        res.json({
            success: true,
            data: {
                group: group[0]?.name || 'Группа',
                subject: subject[0]?.name || 'Предмет',
                students: students
            }
        });
    } catch (error) {
        console.error('Get gradebook error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки ведомости'
        });
    }
});

// 📍 Добавление/обновление оценки
app.post('/api/grades', authenticateToken, async (req, res) => {
    try {
        const { student_id, subject_id, grade, grade_type, date } = req.body;

        if (!student_id || !subject_id || !grade || !grade_type || !date) {
            return res.status(400).json({
                success: false,
                error: 'Все поля обязательны'
            });
        }

        // Проверяем существующую оценку
        const existingGrade = await database.query(
            'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND grade_type = ?',
            [student_id, subject_id, grade_type]
        );

        if (existingGrade.length > 0) {
            // Обновляем существующую оценку
            await database.run(
                'UPDATE grades SET grade = ?, date = ?, teacher_id = ? WHERE id = ?',
                [grade, date, req.user.teacher_id || req.user.id, existingGrade[0].id]
            );
            
            res.json({
                success: true,
                message: 'Оценка обновлена'
            });
        } else {
            // Добавляем новую оценку
            await database.run(
                `INSERT INTO grades (student_id, subject_id, grade, grade_type, date, teacher_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [student_id, subject_id, grade, grade_type, date, req.user.teacher_id || req.user.id]
            );
            
            res.json({
                success: true,
                message: 'Оценка добавлена'
            });
        }

    } catch (error) {
        console.error('Save grade error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сохранения оценки'
        });
    }
});

// 📍 Статистика
app.get('/api/statistics/overview', authenticateToken, async (req, res) => {
    try {
        const studentsCount = await database.query('SELECT COUNT(*) as count FROM students');
        const teachersCount = await database.query('SELECT COUNT(*) as count FROM teachers');
        const subjectsCount = await database.query('SELECT COUNT(*) as count FROM subjects');
        const gradesCount = await database.query('SELECT COUNT(*) as count FROM grades');

        res.json({
            success: true,
            data: {
                students: studentsCount[0].count,
                teachers: teachersCount[0].count,
                subjects: subjectsCount[0].count,
                grades: gradesCount[0].count
            }
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики'
        });
    }
});

// 📍 Маршруты статистики групп
app.get('/api/statistics/groups', authenticateToken, async (req, res) => {
    try {
        const groupsStats = await database.query(`
            SELECT g.id, g.name as group_name, g.specialization,
                   COUNT(s.id) as student_count,
                   AVG(gr.grade) as average_grade,
                   CASE 
                     WHEN COUNT(gr.id) > 0 THEN 
                       (COUNT(CASE WHEN gr.grade >= 3 THEN 1 END) * 100.0 / COUNT(gr.id))
                     ELSE 0 
                   END as success_rate
            FROM groups g
            LEFT JOIN students s ON g.id = s.group_id
            LEFT JOIN grades gr ON s.id = gr.student_id
            GROUP BY g.id, g.name, g.specialization
            ORDER BY average_grade DESC
        `);

        res.json({
            success: true,
            data: groupsStats
        });
    } catch (error) {
        console.error('Groups statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики групп'
        });
    }
});

// 📍 Маршруты статистики предметов
app.get('/api/statistics/subjects', authenticateToken, async (req, res) => {
    try {
        const subjectsStats = await database.query(`
            SELECT s.id, s.name as subject_name, s.hours, s.semester,
                   t.name as teacher_name,
                   AVG(g.grade) as average_grade,
                   COUNT(g.id) as grade_count
            FROM subjects s
            LEFT JOIN teachers t ON s.teacher_id = t.id
            LEFT JOIN grades g ON s.id = g.subject_id
            GROUP BY s.id, s.name, s.hours, s.semester, t.name
            ORDER BY average_grade DESC
        `);

        res.json({
            success: true,
            data: subjectsStats
        });
    } catch (error) {
        console.error('Subjects statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики предметов'
        });
    }
});

// 📍 Распределение оценок
app.get('/api/statistics/grades-distribution', authenticateToken, async (req, res) => {
    try {
        const gradesDistribution = await database.query(`
            SELECT grade, COUNT(*) as count,
                   (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM grades)) as percentage
            FROM grades
            GROUP BY grade
            ORDER BY grade DESC
        `);

        res.json({
            success: true,
            data: gradesDistribution
        });
    } catch (error) {
        console.error('Grades distribution error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки распределения оценок'
        });
    }
});

// 📍 Месячная статистика
app.get('/api/statistics/monthly', authenticateToken, async (req, res) => {
    try {
        const monthlyStats = await database.query(`
            SELECT strftime('%Y-%m', date) as month,
                   AVG(grade) as average_grade,
                   COUNT(*) as grade_count
            FROM grades
            WHERE date IS NOT NULL
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month DESC
            LIMIT 12
        `);

        res.json({
            success: true,
            data: monthlyStats
        });
    } catch (error) {
        console.error('Monthly statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки месячной статистики'
        });
    }
});

// 📍 Главный маршрут
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 📍 Маршруты расписания для студента
app.get('/api/schedule/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Получаем данные студента
        const student = await database.query(`
            SELECT s.*, g.name as group_name 
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE s.id = ?
        `, [studentId]);

        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Студент не найден'
            });
        }

        // Получаем расписание для группы студента
        const schedule = await database.query(`
            SELECT sch.*, 
                   sub.name as subject_name,
                   t.name as teacher_name,
                   g.name as group_name
            FROM schedule sch
            LEFT JOIN subjects sub ON sch.subject_id = sub.id
            LEFT JOIN teachers t ON sch.teacher_id = t.id
            LEFT JOIN groups g ON sch.group_id = g.id
            WHERE sch.group_id = ?
            ORDER BY sch.day_of_week, sch.start_time
        `, [student[0].group_id]);

        res.json({
            success: true,
            data: {
                student: student[0],
                schedule: schedule
            }
        });

    } catch (error) {
        console.error('Student schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки расписания'
        });
    }
});

// 📍 Маршруты расписания для преподавателя
app.get('/api/schedule/teacher/:teacherId', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const schedule = await database.query(`
            SELECT sch.*, 
                   sub.name as subject_name,
                   g.name as group_name
            FROM schedule sch
            LEFT JOIN subjects sub ON sch.subject_id = sub.id
            LEFT JOIN groups g ON sch.group_id = g.id
            WHERE sch.teacher_id = ?
            ORDER BY sch.day_of_week, sch.start_time
        `, [teacherId]);

        res.json({
            success: true,
            data: schedule
        });

    } catch (error) {
        console.error('Teacher schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки расписания'
        });
    }
});

// 📍 Маршруты посещаемости для студента
app.get('/api/attendance/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Получаем данные студента
        const student = await database.query(`
            SELECT s.*, g.name as group_name 
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE s.id = ?
        `, [studentId]);

        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Студент не найден'
            });
        }

        // Исправленный запрос - убрали schedule_id
        const attendance = await database.query(`
            SELECT a.*, 
                   sub.name as subject_name,
                   t.name as teacher_name
            FROM attendance a
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            LEFT JOIN teachers t ON sub.teacher_id = t.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [studentId]);

        res.json({
            success: true,
            data: {
                student: student[0],
                attendance: attendance
            }
        });

    } catch (error) {
        console.error('Student attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки посещаемости'
        });
    }
});

// 📍 Оценки преподавателя (оценки, которые поставил преподаватель)
app.get('/api/grades/teacher/:teacherId', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const grades = await database.query(`
            SELECT g.*, 
                   s.name as student_name,
                   s.student_card,
                   gr.name as group_name,
                   sub.name as subject_name
            FROM grades g
            LEFT JOIN students s ON g.student_id = s.id
            LEFT JOIN groups gr ON s.group_id = gr.id
            LEFT JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.teacher_id = ?
            ORDER BY g.date DESC
        `, [teacherId]);

        res.json({
            success: true,
            data: grades
        });
    } catch (error) {
        console.error('Get teacher grades error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки оценок'
        });
    }
});

// 📍 Студенты преподавателя (студенты, которых ведет преподаватель)
app.get('/api/teacher/:teacherId/students', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const students = await database.query(`
            SELECT DISTINCT s.*, g.name as group_name
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
            LEFT JOIN grades gr ON s.id = gr.student_id
            LEFT JOIN subjects sub ON gr.subject_id = sub.id
            WHERE sub.teacher_id = ? OR gr.teacher_id = ?
            ORDER BY s.name
        `, [teacherId, teacherId]);

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Get teacher students error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки студентов'
        });
    }
});

// 📍 Получение студентов по группе
app.get('/api/groups/:groupId/students', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const students = await database.query(`
            SELECT s.id, s.name, s.student_card
            FROM students s
            WHERE s.group_id = ?
            ORDER BY s.name
        `, [groupId]);

        res.json({
            success: true,
            data: students
        });

    } catch (error) {
        console.error('Get group students error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки студентов группы'
        });
    }
});

// 📍 Сохранение посещаемости
app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { date, subject_id, group_id, attendance_records } = req.body;

        if (!date || !subject_id || !group_id || !attendance_records) {
            return res.status(400).json({
                success: false,
                error: 'Не все данные предоставлены'
            });
        }

        // Удаляем старые записи за эту дату
        await database.query(`
            DELETE FROM attendance 
            WHERE date = ? AND student_id IN (
                SELECT id FROM students WHERE group_id = ?
            ) AND subject_id = ?
        `, [date, group_id, subject_id]);

        // Добавляем новые записи
        for (const record of attendance_records) {
            await database.query(`
                INSERT INTO attendance (student_id, subject_id, date, status, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [record.student_id, subject_id, date, record.status, record.notes || '']);
        }

        res.json({
            success: true,
            message: 'Посещаемость успешно сохранена'
        });

    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сохранения посещаемости'
        });
    }
});

// 📍 Получение посещаемости по дате, группе и предмету
app.get('/api/attendance/:date/:groupId/:subjectId', authenticateToken, async (req, res) => {
    try {
        const { date, groupId, subjectId } = req.params;
        
        const attendance = await database.query(`
            SELECT a.*, s.name as student_name, s.student_card
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            WHERE a.date = ? AND s.group_id = ? AND a.subject_id = ?
            ORDER BY s.name
        `, [date, groupId, subjectId]);

        res.json({
            success: true,
            data: attendance
        });

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки посещаемости'
        });
    }
});

// 📍 Получение групп преподавателя (группы, которые ведет преподаватель)
app.get('/api/teacher/:teacherId/groups', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Исправленный запрос - убрали group_id из subjects
        const groups = await database.query(`
            SELECT DISTINCT g.*
            FROM groups g
            LEFT JOIN students s ON g.id = s.group_id
            LEFT JOIN grades gr ON s.id = gr.student_id
            LEFT JOIN subjects sub ON gr.subject_id = sub.id
            WHERE sub.teacher_id = ? OR gr.teacher_id = ?
            ORDER BY g.name
        `, [teacherId, teacherId]);

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Get teacher groups error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки групп'
        });
    }
});

// 📍 Получение предметов преподавателя
app.get('/api/teacher/:teacherId/subjects', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Исправленный запрос - убрали group_id
        const subjects = await database.query(`
            SELECT DISTINCT s.*
            FROM subjects s
            WHERE s.teacher_id = ?
            ORDER BY s.name
        `, [teacherId]);

        res.json({
            success: true,
            data: subjects
        });
    } catch (error) {
        console.error('Get teacher subjects error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки предметов'
        });
    }
});

// 📍 Получение студентов группы для отметки посещаемости
app.get('/api/groups/:groupId/students-with-attendance', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { date, subjectId } = req.query;
        
        let students = await database.query(`
            SELECT s.id, s.name, s.student_card
            FROM students s
            WHERE s.group_id = ?
            ORDER BY s.name
        `, [groupId]);

        // Если указана дата и предмет - загружаем существующую посещаемость
        if (date && subjectId) {
            const attendance = await database.query(`
                SELECT a.* 
                FROM attendance a 
                WHERE a.date = ? AND a.subject_id = ? AND a.student_id IN (
                    SELECT id FROM students WHERE group_id = ?
                )
            `, [date, subjectId, groupId]);

            // Объединяем данные
            students = students.map(student => {
                const studentAttendance = attendance.find(a => a.student_id === student.id);
                return {
                    ...student,
                    attendance_id: studentAttendance?.id || null,
                    status: studentAttendance?.status || 'absent',
                    notes: studentAttendance?.notes || ''
                };
            });
        }

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Get group students with attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки студентов'
        });
    }
});

// 📍 Сохранение посещаемости для преподавателя
app.post('/api/teacher/attendance', authenticateToken, async (req, res) => {
    try {
        const { date, subject_id, group_id, attendance_records } = req.body;

        if (!date || !subject_id || !group_id || !attendance_records) {
            return res.status(400).json({
                success: false,
                error: 'Не все данные предоставлены'
            });
        }

        // Удаляем старые записи за эту дату
        await database.run(`
            DELETE FROM attendance 
            WHERE date = ? AND subject_id = ? AND student_id IN (
                SELECT id FROM students WHERE group_id = ?
            )
        `, [date, subject_id, group_id]);

        // Добавляем новые записи
        for (const record of attendance_records) {
            await database.run(`
                INSERT INTO attendance (student_id, subject_id, date, status, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [record.student_id, subject_id, date, record.status, record.notes || '']);
        }

        res.json({
            success: true,
            message: 'Посещаемость успешно сохранена'
        });

    } catch (error) {
        console.error('Save teacher attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сохранения посещаемости'
        });
    }
});

// 📍 Статистика пользователей
app.get('/api/statistics/users', authenticateToken, async (req, res) => {
    try {
        const usersCount = await database.query('SELECT COUNT(*) as count FROM users');
        const studentsCount = await database.query('SELECT COUNT(*) as count FROM students');
        const teachersCount = await database.query('SELECT COUNT(*) as count FROM teachers');
        
        res.json({
            success: true,
            data: {
                users: usersCount[0].count,
                students: studentsCount[0].count,
                teachers: teachersCount[0].count
            }
        });
    } catch (error) {
        console.error('Users statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики пользователей'
        });
    }
});

// 📍 Статистика преподавателя
app.get('/api/teacher/:teacherId/statistics', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Количество студентов у преподавателя
        const studentsCount = await database.query(`
            SELECT COUNT(DISTINCT s.id) as count
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id
            LEFT JOIN subjects sub ON g.subject_id = sub.id
            WHERE sub.teacher_id = ? OR g.teacher_id = ?
        `, [teacherId, teacherId]);

        // Количество поставленных оценок
        const gradesCount = await database.query(`
            SELECT COUNT(*) as count
            FROM grades
            WHERE teacher_id = ?
        `, [teacherId]);

        // Средний балл по оценкам преподавателя
        const averageGrade = await database.query(`
            SELECT AVG(grade) as average
            FROM grades
            WHERE teacher_id = ?
        `, [teacherId]);

        // Статистика по предметам
        const subjectsStats = await database.query(`
            SELECT s.name, COUNT(g.id) as grade_count, AVG(g.grade) as average_grade
            FROM subjects s
            LEFT JOIN grades g ON s.id = g.subject_id
            WHERE s.teacher_id = ? AND g.teacher_id = ?
            GROUP BY s.id, s.name
        `, [teacherId, teacherId]);

        // Распределение оценок
        const gradesDistribution = await database.query(`
            SELECT grade, COUNT(*) as count
            FROM grades
            WHERE teacher_id = ?
            GROUP BY grade
            ORDER BY grade DESC
        `, [teacherId]);

        res.json({
            success: true,
            data: {
                students_count: studentsCount[0]?.count || 0,
                grades_count: gradesCount[0]?.count || 0,
                average_grade: Math.round(averageGrade[0]?.average * 100) / 100 || 0,
                subjects_stats: subjectsStats,
                grades_distribution: gradesDistribution
            }
        });

    } catch (error) {
        console.error('Teacher statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики преподавателя'
        });
    }
});

// 📍 Последние оценки преподавателя
app.get('/api/teacher/:teacherId/recent-grades', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const recentGrades = await database.query(`
            SELECT g.*, 
                   s.name as student_name,
                   s.student_card,
                   gr.name as group_name,
                   sub.name as subject_name
            FROM grades g
            LEFT JOIN students s ON g.student_id = s.id
            LEFT JOIN groups gr ON s.group_id = gr.id
            LEFT JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.teacher_id = ?
            ORDER BY g.date DESC, g.created_at DESC
            LIMIT 10
        `, [teacherId]);

        res.json({
            success: true,
            data: recentGrades
        });
    } catch (error) {
        console.error('Get teacher recent grades error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки последних оценок'
        });
    }
});

// 📍 Генерация отчета по студенту
app.get('/api/reports/student/:studentId', authenticateTokenFromQuery, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { format = 'html' } = req.query;

        // Проверяем права доступа
        if (req.user.role === 'student' && req.user.student_id != studentId) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        // Получаем данные студента
        const studentData = await database.query(`
            SELECT s.*, g.name as group_name 
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE s.id = ?
        `, [studentId]);

        if (studentData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Студент не найден'
            });
        }

        // Получаем оценки студента
        const grades = await database.query(`
            SELECT g.*, s.name as subject_name, t.name as teacher_name
            FROM grades g
            LEFT JOIN subjects s ON g.subject_id = s.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            WHERE g.student_id = ?
            ORDER BY g.date DESC
        `, [studentId]);

        // Получаем посещаемость
        const attendance = await database.query(`
            SELECT a.*, sub.name as subject_name
            FROM attendance a
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
            LIMIT 50
        `, [studentId]);

        // Рассчитываем статистику
        const totalGrades = grades.length;
        const averageGrade = totalGrades > 0 
            ? (grades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades).toFixed(2)
            : 0;

        const attendanceStats = attendance.reduce((stats, record) => {
            if (record.status === 'present') stats.present++;
            else stats.absent++;
            return stats;
        }, { present: 0, absent: 0 });

        const reportData = {
            student: studentData[0],
            grades: grades,
            attendance: attendance,
            statistics: {
                totalGrades: totalGrades,
                averageGrade: averageGrade,
                attendance: attendanceStats,
                attendancePercentage: attendance.length > 0 
                    ? ((attendanceStats.present / attendance.length) * 100).toFixed(1)
                    : 0
            },
            generatedAt: new Date().toLocaleString('ru-RU')
        };

        if (format === 'json') {
            res.json({
                success: true,
                data: reportData
            });
        } else {
            // Генерируем HTML отчет
            const htmlReport = generateStudentHTMLReport(reportData);
            res.send(htmlReport);
        }

    } catch (error) {
        console.error('Student report error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📍 Генерация отчета по группе
app.get('/api/reports/group/:groupId', authenticateTokenFromQuery, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { format = 'html' } = req.query;

        // Проверяем права доступа для преподавателей
        if (req.user.role === 'teacher') {
            const teacherGroups = await database.query(`
                SELECT DISTINCT g.id
                FROM groups g
                LEFT JOIN students s ON g.id = s.group_id
                LEFT JOIN grades gr ON s.id = gr.student_id
                LEFT JOIN subjects sub ON gr.subject_id = sub.id
                WHERE sub.teacher_id = ? OR gr.teacher_id = ?
            `, [req.user.teacher_id, req.user.teacher_id]);

            const hasAccess = teacherGroups.some(group => group.id == groupId);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'Доступ запрещен'
                });
            }
        }

        // Получаем данные группы
        const groupData = await database.query('SELECT * FROM groups WHERE id = ?', [groupId]);
        
        if (groupData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Группа не найдена'
            });
        }

        // Получаем студентов группы
        const students = await database.query(`
            SELECT s.*, 
                   COUNT(g.id) as grades_count,
                   AVG(g.grade) as average_grade
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id
            WHERE s.group_id = ?
            GROUP BY s.id, s.name, s.student_card
            ORDER BY s.name
        `, [groupId]);

        // Получаем общую статистику по группе
        const groupStats = await database.query(`
            SELECT 
                COUNT(DISTINCT s.id) as total_students,
                COUNT(g.id) as total_grades,
                AVG(g.grade) as group_average,
                COUNT(CASE WHEN g.grade >= 4 THEN 1 END) as good_grades,
                COUNT(CASE WHEN g.grade < 3 THEN 1 END) as bad_grades
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id
            WHERE s.group_id = ?
        `, [groupId]);

        const reportData = {
            group: groupData[0],
            students: students,
            statistics: groupStats[0],
            generatedAt: new Date().toLocaleString('ru-RU')
        };

        if (format === 'json') {
            res.json({
                success: true,
                data: reportData
            });
        } else {
            const htmlReport = generateGroupHTMLReport(reportData);
            res.send(htmlReport);
        }

    } catch (error) {
        console.error('Group report error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка генерации отчета по группе'
        });
    }
});

// Функция генерации HTML отчета для студента
function generateStudentHTMLReport(data) {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по студенту - ${data.student.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #007bff; color: white; }
        .badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .badge-success { background: #28a745; }
        .badge-warning { background: #ffc107; }
        .badge-danger { background: #dc3545; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Академический отчет</h1>
        <h2>Студент: ${data.student.name}</h2>
        <p>Группа: ${data.student.group_name || 'Не указана'} | Зачетка: ${data.student.student_card || 'Не указан'}</p>
    </div>

    <div class="section">
        <h3>📈 Статистика</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Всего оценок</h4>
                <p style="font-size: 24px; margin: 0; color: #007bff;">${data.statistics.totalGrades}</p>
            </div>
            <div class="stat-card">
                <h4>Средний балл</h4>
                <p style="font-size: 24px; margin: 0; color: #28a745;">${data.statistics.averageGrade}</p>
            </div>
            <div class="stat-card">
                <h4>Посещаемость</h4>
                <p style="font-size: 24px; margin: 0; color: #17a2b8;">${data.statistics.attendancePercentage}%</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>📝 Оценки</h3>
        ${data.grades.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Предмет</th>
                        <th>Оценка</th>
                        <th>Тип</th>
                        <th>Дата</th>
                        <th>Преподаватель</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.grades.map(grade => `
                        <tr>
                            <td>${grade.subject_name || 'Не указан'}</td>
                            <td>
                                <span class="badge ${grade.grade >= 4 ? 'badge-success' : grade.grade >= 3 ? 'badge-warning' : 'badge-danger'}">
                                    ${grade.grade}
                                </span>
                            </td>
                            <td>${grade.grade_type || 'Не указан'}</td>
                            <td>${new Date(grade.date).toLocaleDateString('ru-RU')}</td>
                            <td>${grade.teacher_name || 'Не указан'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Оценок нет</p>'}
    </div>

    <div class="section">
        <h3>✅ Посещаемость (последние 50 записей)</h3>
        ${data.attendance.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Предмет</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.attendance.map(record => `
                        <tr>
                            <td>${new Date(record.date).toLocaleDateString('ru-RU')}</td>
                            <td>${record.subject_name || 'Не указан'}</td>
                            <td>
                                <span class="badge ${record.status === 'present' ? 'badge-success' : 'badge-danger'}">
                                    ${record.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Записей о посещаемости нет</p>'}
    </div>

    <div class="footer">
        <p>Отчет сгенерирован: ${data.generatedAt}</p>
        <p>Система электронной зачетки</p>
    </div>
</body>
</html>
    `;
}

// Функция генерации HTML отчета для группы
function generateGroupHTMLReport(data) {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по группе - ${data.group.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #007bff; color: white; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Отчет по группе</h1>
        <h2>Группа: ${data.group.name}</h2>
        <p>Специализация: ${data.group.specialization || 'Не указана'}</p>
    </div>

    <div class="section">
        <h3>📈 Общая статистика группы</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Студентов</h4>
                <p style="font-size: 24px; margin: 0; color: #007bff;">${data.statistics.total_students}</p>
            </div>
            <div class="stat-card">
                <h4>Всего оценок</h4>
                <p style="font-size: 24px; margin: 0; color: #28a745;">${data.statistics.total_grades}</p>
            </div>
            <div class="stat-card">
                <h4>Средний балл</h4>
                <p style="font-size: 24px; margin: 0; color: #17a2b8;">${Math.round(data.statistics.group_average * 100) / 100 || 0}</p>
            </div>
            <div class="stat-card">
                <h4>Успеваемость</h4>
                <p style="font-size: 24px; margin: 0; color: #ffc107;">
                    ${data.statistics.total_grades > 0 ? Math.round((data.statistics.good_grades / data.statistics.total_grades) * 100) : 0}%
                </p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>🎓 Список студентов</h3>
        ${data.students.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Студент</th>
                        <th>Номер зачетки</th>
                        <th>Кол-во оценок</th>
                        <th>Средний балл</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.students.map(student => `
                        <tr>
                            <td>${student.name}</td>
                            <td>${student.student_card || 'Не указан'}</td>
                            <td>${student.grades_count || 0}</td>
                            <td>${Math.round(student.average_grade * 100) / 100 || 'Нет оценок'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>В группе нет студентов</p>'}
    </div>

    <div class="footer">
        <p>Отчет сгенерирован: ${data.generatedAt}</p>
        <p>Система электронной зачетки</p>
    </div>
</body>
</html>
    `;
}

// 📍 Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Откройте http://localhost:${PORT}`);
});

// 📍 Обработка несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден'
    });
});