// fix-attendance-table.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Пересоздание таблицы attendance...');

// Удаляем старую таблицу если существует
const dropTable = `DROP TABLE IF EXISTS attendance`;

// Создаем новую таблицу
const createAttendanceTable = `
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
`;

// Тестовые данные
const insertAttendanceData = `
INSERT INTO attendance (student_id, subject_id, teacher_id, date, status, notes)
VALUES 
    (1, 1, 1, '2024-10-15', 'present', ''),
    (2, 1, 1, '2024-10-15', 'present', ''),
    (3, 1, 1, '2024-10-15', 'absent', 'Болел'),
    (4, 1, 1, '2024-10-15', 'late', 'Опоздал на 10 минут')
`;

db.serialize(() => {
    db.run(dropTable, (err) => {
        if (err) {
            console.error('❌ Ошибка удаления таблицы:', err);
            db.close();
            return;
        }
        console.log('✅ Старая таблица удалена');
        
        db.run(createAttendanceTable, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы:', err);
                db.close();
                return;
            }
            console.log('✅ Новая таблица создана');
            
            db.run(insertAttendanceData, (err) => {
                if (err) {
                    console.error('❌ Ошибка заполнения данными:', err);
                } else {
                    console.log('✅ Тестовые данные добавлены');
                }
                
                db.close();
                console.log('🎉 Таблица attendance исправлена!');
            });
        });
    });
});