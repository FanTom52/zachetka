const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./gradebook.db', (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к БД:', err.message);
            } else {
                console.log('✅ Подключение к SQLite базе данных установлено');
                this.initializeDatabase();
            }
        });
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка SQL запроса:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Ошибка SQL выполнения:', err);
                    reject(err);
                } else {
                    resolve({ 
                        insertId: this.lastID, 
                        changes: this.changes 
                    });
                }
            });
        });
    }

    async initializeDatabase() {
        try {
            console.log('🚀 Инициализация базы данных...');
            
            // Создание таблиц
            await this.createTables();
            
            // Заполнение тестовыми данными
            await this.populateTestData();
            
            console.log('✅ База данных успешно инициализирована!');
        } catch (error) {
            console.error('❌ Ошибка инициализации базы данных:', error);
        }
    }

    async createTables() {
        // Удаляем старые таблицы если они есть
        await this.run('DROP TABLE IF EXISTS attendance');
        await this.run('DROP TABLE IF EXISTS schedule');
        
        const tables = [
            // Таблица групп
            `CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                course INTEGER NOT NULL,
                specialization TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Таблица студентов
            `CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                group_id INTEGER,
                student_card TEXT UNIQUE,
                email TEXT,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id)
            )`,

            // Таблица преподавателей
            `CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                department TEXT,
                position TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Таблица предметов
            `CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                hours INTEGER,
                semester INTEGER,
                teacher_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id)
            )`,

            // Таблица оценок и зачётов - ИСПРАВЛЕННАЯ ВЕРСИЯ
`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    grade INTEGER CHECK(grade BETWEEN 2 AND 5 OR grade IS NULL),
    is_pass INTEGER CHECK(is_pass IN (0, 1)),
    grade_type TEXT NOT NULL CHECK(grade_type IN ('exam', 'test', 'credit', 'coursework', 'practice')),
    date TEXT NOT NULL,
    teacher_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE(student_id, subject_id, grade_type)
)`,

            // Таблица пользователей для авторизации
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
                student_id INTEGER,
                teacher_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (teacher_id) REFERENCES teachers(id)
            )`,

            // Таблица расписания
            `CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER,
                subject_id INTEGER,
                teacher_id INTEGER,
                day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 6),
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                classroom TEXT,
                lesson_type TEXT CHECK(lesson_type IN ('lecture', 'practice', 'lab', 'seminar')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (teacher_id) REFERENCES teachers(id)
            )`,

            // Таблица посещаемости (упрощенная версия без schedule_id)
            `CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                subject_id INTEGER,
                date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'sick')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id)
            )`
        ];

        for (const tableSql of tables) {
            await this.run(tableSql);
        }
        
        console.log('✅ Все таблицы созданы');
    }

    async populateTestData() {
        console.log('📥 Заполняем базу тестовыми данными...');
        
        // Группы
        const groupsData = [
            ['ИТ-21', 2, 'Информационные технологии'],
            ['П-22', 1, 'Программирование'],
            ['К-21', 2, 'Компьютерные сети']
        ];

        for (const group of groupsData) {
            await this.run(
                'INSERT OR IGNORE INTO groups (name, course, specialization) VALUES (?, ?, ?)',
                group
            );
        }
        console.log('✅ Группы добавлены');

        // Преподаватели
        const teachersData = [
            ['Иванова Мария Сергеевна', 'ivanova@tech.ru', 'Программирование', 'Старший преподаватель'],
            ['Петров Алексей Владимирович', 'petrov@tech.ru', 'Базы данных', 'Доцент'],
            ['Сидорова Елена Дмитриевна', 'sidorova@tech.ru', 'Математика', 'Профессор']
        ];

        for (const teacher of teachersData) {
            await this.run(
                'INSERT OR IGNORE INTO teachers (name, email, department, position) VALUES (?, ?, ?, ?)',
                teacher
            );
        }
        console.log('✅ Преподаватели добавлены');

        // Студенты
        const studentsData = [
            ['Иванов Алексей Сергеевич', 1, 'СТ-001', 'ivanov@student.tech.ru', '+79161234567'],
            ['Петрова Мария Дмитриевна', 1, 'СТ-002', 'petrova@student.tech.ru', '+79161234568'],
            ['Сидоров Дмитрий Иванович', 2, 'СТ-003', 'sidorov@student.tech.ru', '+79161234569'],
            ['Козлова Анна Петровна', 2, 'СТ-004', 'kozlova@student.tech.ru', '+79161234570']
        ];

        for (const student of studentsData) {
            await this.run(
                'INSERT OR IGNORE INTO students (name, group_id, student_card, email, phone) VALUES (?, ?, ?, ?, ?)',
                student
            );
        }
        console.log('✅ Студенты добавлены');

        // Предметы
        const subjectsData = [
            ['Программирование на Python', 120, 1, 1],
            ['Базы данных', 90, 1, 2],
            ['Высшая математика', 150, 1, 3],
            ['Веб-технологии', 80, 2, 1]
        ];

        for (const subject of subjectsData) {
            await this.run(
                'INSERT OR IGNORE INTO subjects (name, hours, semester, teacher_id) VALUES (?, ?, ?, ?)',
                subject
            );
        }
        console.log('✅ Предметы добавлены');

        // Пользователи
        const hashedAdminPassword = await bcrypt.hash('admin123', 10);
        const hashedTeacherPassword = await bcrypt.hash('teacher123', 10);
        const hashedStudentPassword = await bcrypt.hash('student123', 10);

        const usersData = [
            ['admin', hashedAdminPassword, 'admin', null, null],
            ['teacher', hashedTeacherPassword, 'teacher', null, 1],
            ['student', hashedStudentPassword, 'student', 1, null]
        ];

        for (const user of usersData) {
            await this.run(
                'INSERT OR IGNORE INTO users (username, password, role, student_id, teacher_id) VALUES (?, ?, ?, ?, ?)',
                user
            );
        }
        console.log('✅ Пользователи добавлены');

        // Расписание
        const scheduleData = [
            [1, 1, 1, 1, '09:00', '10:30', 'А-101', 'lecture'],
            [1, 2, 2, 1, '10:45', '12:15', 'Б-201', 'practice'],
            [1, 3, 3, 2, '09:00', '10:30', 'А-102', 'lecture'],
            [2, 1, 1, 3, '10:45', '12:15', 'Л-301', 'lab']
        ];

        for (const lesson of scheduleData) {
            await this.run(
                `INSERT OR IGNORE INTO schedule (group_id, subject_id, teacher_id, day_of_week, start_time, end_time, classroom, lesson_type) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                lesson
            );
        }
        console.log('✅ Расписание добавлено');

        // Посещаемость (упрощенная версия)
        const attendanceData = [
            [1, 1, '2024-01-15', 'present', ''],
            [1, 2, '2024-01-15', 'late', 'Опоздание 10 минут'],
            [2, 1, '2024-01-15', 'present', ''],
            [3, 3, '2024-01-16', 'sick', 'Больничный']
        ];

        for (const record of attendanceData) {
            await this.run(
                `INSERT OR IGNORE INTO attendance (student_id, subject_id, date, status, notes) 
                 VALUES (?, ?, ?, ?, ?)`,
                record
            );
        }
        console.log('✅ Посещаемость добавлена');

        console.log('🎉 Все тестовые данные успешно добавлены!');
    }
}

module.exports = new Database();