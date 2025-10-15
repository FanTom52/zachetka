// create-session-schedule-table.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

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

const insertSessionScheduleData = `
INSERT INTO session_schedule (subject_id, group_id, teacher_id, event_type, event_date, start_time, end_time, classroom, notes)
VALUES 
    (1, 1, 1, 'exam', '2024-12-20', '09:00', '10:30', 'Аудитория 101', 'Экзамен по программированию'),
    (2, 1, 2, 'test', '2024-12-22', '11:00', '12:00', 'Аудитория 102', 'Зачёт по базам данных'),
    (3, 2, 1, 'credit', '2024-12-25', '14:00', '15:30', 'Аудитория 201', 'Дифзачёт по математике'),
    (1, 2, 1, 'consultation', '2024-12-18', '16:00', '17:00', 'Каб. 305', 'Консультация перед экзаменом');
`;

console.log('🔄 Создание таблицы session_schedule...');

db.serialize(() => {
    db.run(createSessionScheduleTable, function(err) {
        if (err) {
            console.error('❌ Ошибка создания таблицы:', err);
            process.exit(1);
        }
        console.log('✅ Таблица session_schedule создана');
        
        db.run(insertSessionScheduleData, function(err) {
            if (err) {
                console.error('❌ Ошибка заполнения данными:', err);
            } else {
                console.log('✅ Тестовые данные добавлены');
            }
            
            db.close();
            console.log('🎉 Миграция завершена!');
        });
    });
});