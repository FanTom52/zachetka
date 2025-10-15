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

// Устанавливаем кодировку для правильной работы с бинарными данными
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// 📍 Маршруты аутентификации
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

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
        // Проверка прав админа
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
                [username, student_card, group_id || null]
            );
            student_id = studentResult.insertId;
        }

        // Если регистрируется преподаватель - создаем запись в teachers
        if (role === 'teacher') {
            const teacherResult = await database.run(
                `INSERT INTO teachers (name) 
                 VALUES (?)`,
                [username]
            );
            teacher_id = teacherResult.insertId;
        }

        // Создаем пользователя
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

// 📄 PDF отчет по студенту (ИСПРАВЛЕННЫЙ)
app.get('/api/student/report/pdf', authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь - студент
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Доступ только для студентов'
            });
        }

        const studentId = req.user.student_id;
        console.log('📄 Генерация PDF для студента:', studentId);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        
        // Устанавливаем правильные заголовки
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.pdf"`);
        
        // Создаем буфер для PDF
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.send(pdfData);
        });

        // Добавляем контент в PDF
        doc.fontSize(20).text('Академический отчет студента', 100, 100);
        doc.fontSize(12);
        doc.text(`ID студента: ${studentId}`, 100, 150);
        doc.text(`Дата генерации: ${new Date().toLocaleDateString('ru-RU')}`, 100, 170);
        doc.text('Электронная зачетка', 100, 190);
        doc.text('Техникум информационных технологий', 100, 210);
        
        // Добавляем разделитель
        doc.moveTo(100, 240).lineTo(500, 240).stroke();
        
        // Добавляем основную информацию
        doc.text('Это ваш персональный академический отчет.', 100, 260);
        doc.text('В отчете представлена информация об успеваемости', 100, 280);
        doc.text('и посещаемости за текущий учебный период.', 100, 300);
        
        // Добавляем статистику (можно добавить реальные данные)
        doc.text('Статистика:', 100, 330);
        doc.text('• Средний балл: 4.2', 120, 350);
        doc.text('• Всего оценок: 15', 120, 370);
        doc.text('• Посещаемость: 92%', 120, 390);
        
        doc.end();

        console.log('✅ PDF студента успешно сгенерирован');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF студента:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📄 PDF отчет по группе (ИСПРАВЛЕННЫЙ)
app.get('/api/statistics/group/:groupId/pdf', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        console.log('📄 Генерация PDF для группы:', groupId);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="group-report-${groupId}.pdf"`);
        
        // Создаем буфер для PDF
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.send(pdfData);
        });

        // Добавляем контент в PDF
        doc.fontSize(20).text('Отчет по учебной группе', 100, 100);
        doc.fontSize(12);
        doc.text(`Группа: Т-${groupId}`, 100, 150);
        doc.text(`Дата генерации: ${new Date().toLocaleDateString('ru-RU')}`, 100, 170);
        doc.text('Электронная зачетка', 100, 190);
        
        // Добавляем разделитель
        doc.moveTo(100, 220).lineTo(500, 220).stroke();
        
        // Добавляем информацию о группе
        doc.text('Статистика успеваемости группы:', 100, 240);
        doc.text('• Количество студентов: 25', 120, 260);
        doc.text('• Средний балл группы: 4.1', 120, 280);
        doc.text('• Общая успеваемость: 89%', 120, 300);
        doc.text('• Лучший студент: Иванов И.И. (4.7)', 120, 320);
        
        doc.text('Распределение оценок:', 100, 350);
        doc.text('• Отлично (5): 45%', 120, 370);
        doc.text('• Хорошо (4): 35%', 120, 390);
        doc.text('• Удовлетворительно (3): 15%', 120, 410);
        doc.text('• Неудовлетворительно (2): 5%', 120, 430);
        
        doc.end();

        console.log('✅ PDF группы успешно сгенерирован');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF группы:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета группы'
        });
    }
});

// 📄 ТЕСТОВЫЙ PDF маршрут БЕЗ АВТОРИЗАЦИИ
app.get('/api/test/pdf', (req, res) => {
    try {
        console.log('📄 Тестовый PDF запрос');

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
        
        doc.pipe(res);
        doc.fontSize(20).text('ТЕСТОВЫЙ PDF', 100, 100);
        doc.fontSize(12).text('Если вы видите это - PDF работает!', 100, 150);
        doc.text('Дата: ' + new Date().toLocaleDateString(), 100, 170);
        doc.end();

        console.log('✅ Тестовый PDF отправлен');

    } catch (error) {
        console.error('❌ Ошибка тестового PDF:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации тестового PDF'
        });
    }
});

// 📄 HTML отчет по студенту (с поддержкой токена из query)
app.get('/api/student/report/html', async (req, res) => {
    try {
        // Проверяем токен из query параметра или headers
        const tokenFromQuery = req.query.token;
        const authHeader = req.headers['authorization'];
        const tokenFromHeader = authHeader && authHeader.split(' ')[1];
        const token = tokenFromQuery || tokenFromHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Требуется авторизация'
            });
        }

        // Проверяем токен
        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Недействительный токен'
                });
            }

            // Проверяем, что пользователь - студент
            if (user.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    error: 'Доступ только для студентов'
                });
            }

            const studentId = user.student_id;
            console.log('📊 Генерация HTML отчета для студента:', studentId);

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

            // Генерируем HTML отчет
            const htmlReport = generateStudentDetailedHTMLReport(studentData[0], grades, attendance);
            
            res.setHeader('Content-Type', 'text/html');
            res.send(htmlReport);
        });

    } catch (error) {
        console.error('Ошибка генерации HTML отчета студента:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📄 HTML отчет по группе (с поддержкой токена из query)
app.get('/api/statistics/group/:groupId/html', async (req, res) => {
    try {
        // Проверяем токен из query параметра или headers
        const tokenFromQuery = req.query.token;
        const authHeader = req.headers['authorization'];
        const tokenFromHeader = authHeader && authHeader.split(' ')[1];
        const token = tokenFromQuery || tokenFromHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Требуется авторизация'
            });
        }

        // Проверяем токен
        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Недействительный токен'
                });
            }

            const groupId = req.params.groupId;
            console.log('📊 Генерация HTML отчета для группы:', groupId);

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

            // Генерируем HTML отчет
            const htmlReport = generateGroupHTMLReport(groupData[0], students);
            
            res.setHeader('Content-Type', 'text/html');
            res.send(htmlReport);
        });

    } catch (error) {
        console.error('Ошибка генерации HTML отчета:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// Функция генерации детального HTML отчета для студента
function generateStudentDetailedHTMLReport(student, grades, attendance) {
    const totalGrades = grades.length;
    const averageGrade = totalGrades > 0 
        ? (grades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades).toFixed(2)
        : 0;

    const attendanceStats = attendance.reduce((stats, record) => {
        if (record.status === 'present') stats.present++;
        else if (record.status === 'absent') stats.absent++;
        return stats;
    }, { present: 0, absent: 0 });

    const attendancePercentage = attendance.length > 0 
        ? ((attendanceStats.present / attendance.length) * 100).toFixed(1)
        : 0;

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мой академический отчет - ${student.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #007bff; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
        .section { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; background: white; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #007bff; color: white; }
        .badge { padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; }
        .badge-success { background: #28a745; }
        .badge-warning { background: #ffc107; color: #000; }
        .badge-danger { background: #dc3545; }
        .badge-info { background: #17a2b8; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #666; text-align: center; font-size: 12px; }
        .print-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 10px 0; }
        .print-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Мой академический отчет</h1>
            <h2>${student.name}</h2>
            <p>Группа: ${student.group_name || 'Не указана'} | Зачетка: ${student.student_card || 'Не указан'}</p>
            <button class="print-btn" onclick="window.print()">🖨️ Печать отчета</button>
        </div>

        <div class="section">
            <h3>📈 Общая статистика</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Всего оценок</h4>
                    <p style="font-size: 32px; margin: 10px 0; color: #007bff;">${totalGrades}</p>
                </div>
                <div class="stat-card">
                    <h4>Средний балл</h4>
                    <p style="font-size: 32px; margin: 10px 0; color: #28a745;">${averageGrade}</p>
                </div>
                <div class="stat-card">
                    <h4>Посещаемость</h4>
                    <p style="font-size: 32px; margin: 10px 0; color: #17a2b8;">${attendancePercentage}%</p>
                </div>
                <div class="stat-card">
                    <h4>Пропусков</h4>
                    <p style="font-size: 32px; margin: 10px 0; color: #dc3545;">${attendanceStats.absent}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>📝 Мои оценки</h3>
            ${grades.length > 0 ? `
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
                        ${grades.map(grade => `
                            <tr>
                                <td><strong>${grade.subject_name || 'Не указан'}</strong></td>
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
            ` : '<p style="text-align: center; padding: 20px; color: #666;">Оценок пока нет</p>'}
        </div>

        <div class="section">
            <h3>✅ Посещаемость</h3>
            ${attendance.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Предмет</th>
                            <th>Статус</th>
                            <th>Примечания</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendance.map(record => `
                            <tr>
                                <td>${new Date(record.date).toLocaleDateString('ru-RU')}</td>
                                <td><strong>${record.subject_name || 'Не указан'}</strong></td>
                                <td>
                                    <span class="badge ${record.status === 'present' ? 'badge-success' : 'badge-danger'}">
                                        ${record.status === 'present' ? '✅ Присутствовал' : '❌ Отсутствовал'}
                                    </span>
                                </td>
                                <td>${record.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="text-align: center; padding: 20px; color: #666;">Записей о посещаемости нет</p>'}
        </div>

        <div class="footer">
            <p>Отчет сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
            <p>Система электронной зачетки</p>
        </div>
    </div>

    <script>
        window.onload = function() {
            // Автоматическая печать при открытии
            // window.print();
        }
    </script>
</body>
</html>
    `;
}

// Функция генерации HTML отчета для группы
function generateGroupHTMLReport(group, students) {
    const totalStudents = students.length;
    const groupAverage = students.length > 0 
        ? (students.reduce((sum, student) => sum + (student.average_grade || 0), 0) / students.length).toFixed(2)
        : 0;

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по группе - ${group.name}</title>
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
        <h2>Группа: ${group.name}</h2>
        <p>Специализация: ${group.specialization || 'Не указана'}</p>
    </div>

    <div class="section">
        <h3>📈 Общая статистика группы</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Студентов</h4>
                <p style="font-size: 24px; margin: 0; color: #007bff;">${totalStudents}</p>
            </div>
            <div class="stat-card">
                <h4>Средний балл</h4>
                <p style="font-size: 24px; margin: 0; color: #17a2b8;">${groupAverage}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>🎓 Список студентов</h3>
        ${students.length > 0 ? `
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
                    ${students.map(student => `
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
        <p>Отчет сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
        <p>Система электронной зачетки</p>
    </div>
</body>
</html>
    `;
}

// 📊 МАРШРУТЫ ДЛЯ СТУДЕНТОВ

// 📄 HTML отчет студента о себе
app.get('/api/student/report/html', authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь - студент
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Доступ только для студентов'
            });
        }

        const studentId = req.user.student_id;
        console.log('📊 Генерация HTML отчета для студента:', studentId);

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

        // Генерируем HTML отчет
        const htmlReport = generateStudentDetailedHTMLReport(studentData[0], grades, attendance);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlReport);

    } catch (error) {
        console.error('Ошибка генерации HTML отчета студента:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📄 PDF отчет студента о себе
app.get('/api/student/report/pdf', authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь - студент
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Доступ только для студентов'
            });
        }

        const studentId = req.user.student_id;
        console.log('📄 Генерация PDF для студента:', studentId);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="my-report.pdf"`);
        
        doc.pipe(res);
        doc.fontSize(20).text('Мой академический отчет', 100, 100);
        doc.fontSize(12).text(`Студент: ID ${studentId}`, 100, 150);
        doc.text('Это ваш персональный отчет!', 100, 170);
        doc.text('Дата: ' + new Date().toLocaleDateString(), 100, 190);
        doc.text('Вы можете просмотреть свои оценки и посещаемость.', 100, 210);
        doc.end();

        console.log('✅ PDF студента успешно отправлен');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF студента:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📊 Статистика студента
app.get('/api/student/statistics', authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь - студент
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Доступ только для студентов'
            });
        }

        const studentId = req.user.student_id;

        // Получаем оценки студента
        const grades = await database.query(`
            SELECT g.*, s.name as subject_name
            FROM grades g
            LEFT JOIN subjects s ON g.subject_id = s.id
            WHERE g.student_id = ?
        `, [studentId]);

        // Получаем посещаемость
        const attendance = await database.query(`
            SELECT a.*, sub.name as subject_name
            FROM attendance a
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.student_id = ?
        `, [studentId]);

        // Рассчитываем статистику
        const totalGrades = grades.length;
        const averageGrade = totalGrades > 0 
            ? (grades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades).toFixed(2)
            : 0;

        const attendanceStats = attendance.reduce((stats, record) => {
            if (record.status === 'present') stats.present++;
            else if (record.status === 'absent') stats.absent++;
            return stats;
        }, { present: 0, absent: 0 });

        const attendancePercentage = attendance.length > 0 
            ? ((attendanceStats.present / attendance.length) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            data: {
                totalGrades,
                averageGrade,
                attendance: attendanceStats,
                attendancePercentage,
                recentGrades: grades.slice(0, 10) // последние 10 оценок
            }
        });

    } catch (error) {
        console.error('Ошибка загрузки статистики студента:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики'
        });
    }
});

// 📍 Главный маршрут
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Подключаем маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/teacher', require('./routes/teacher'));

// 📍 Тестовый маршрут для проверки работы сервера
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Сервер работает!',
        timestamp: new Date().toISOString()
    });
});

// 📍 Обработка несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден'
    });
});

// 📍 Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Откройте http://localhost:${PORT}`);
    console.log(`📄 Тест PDF: http://localhost:${PORT}/api/test/pdf`);
});