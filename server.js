const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('./database');
require('dotenv').config();

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

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
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

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Логин и пароль обязательны'
            });
        }

        // Исправленный запрос - убрали JOIN с user_id
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
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        // Убираем пароль из ответа
        const { password: userPassword, ...userWithoutPassword } = user;

        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при авторизации'
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

        const { password, ...userWithoutPassword } = users[0];
        
        res.json({
            success: true,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
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

        // Получаем посещаемость студента (упрощенная версия)
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

        // Получаем посещаемость студента
        const attendance = await database.query(`
            SELECT a.*, 
                   sub.name as subject_name,
                   t.name as teacher_name,
                   sch.classroom
            FROM attendance a
            LEFT JOIN schedule sch ON a.schedule_id = sch.id
            LEFT JOIN subjects sub ON sch.subject_id = sub.id
            LEFT JOIN teachers t ON sch.teacher_id = t.id
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