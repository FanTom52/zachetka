const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    try {
        // Подключение без выбора базы данных
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Подключение к MySQL установлено');

        // Создание базы данных
        await connection.execute('CREATE DATABASE IF NOT EXISTS gradebook');
        console.log('✅ База данных gradebook создана');

        // Использование базы данных
        await connection.execute('USE gradebook');
        console.log('✅ Используем базу данных gradebook');

        // Создание таблиц из schema.sql
        const fs = require('fs');
        const schema = fs.readFileSync('./database/schema.sql', 'utf8');
        
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
                console.log('✅ Выполнен SQL statement');
            }
        }

        console.log('🎉 База данных успешно инициализирована!');
        await connection.end();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
}

// Создание таблицы расписания сессии
const createSessionScheduleTable = `
CREATE TABLE IF NOT EXISTS session_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('exam', 'test', 'credit', 'consultation')),
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
`;

// Тестовые данные для расписания сессии
const insertSessionScheduleData = `
INSERT OR IGNORE INTO session_schedule (subject_id, group_id, teacher_id, event_type, event_date, start_time, end_time, classroom, notes)
VALUES 
    (1, 1, 1, 'exam', '2024-12-20', '09:00', '10:30', 'Аудитория 101', 'Экзамен по программированию'),
    (2, 1, 2, 'test', '2024-12-22', '11:00', '12:00', 'Аудитория 102', 'Зачёт по базам данных'),
    (3, 2, 1, 'credit', '2024-12-25', '14:00', '15:30', 'Аудитория 201', 'Дифзачёт по математике'),
    (1, 2, 1, 'consultation', '2024-12-18', '16:00', '17:00', 'Каб. 305', 'Консультация перед экзаменом');
`;

initializeDatabase();