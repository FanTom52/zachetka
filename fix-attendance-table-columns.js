// fix-attendance-table-columns.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Исправление структуры таблицы attendance...');

// Создаем временную таблицу с правильной структурой
const createTempTable = `
CREATE TABLE IF NOT EXISTS attendance_temp (
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

// Копируем данные из старой таблицы в новую
const copyData = `
INSERT INTO attendance_temp (id, student_id, subject_id, teacher_id, date, status, notes, created_at)
SELECT 
    id, 
    student_id, 
    subject_id,
    1 as teacher_id, -- Устанавливаем teacher_id = 1 для существующих записей
    date, 
    status, 
    notes, 
    created_at
FROM attendance
`;

// Удаляем старую таблицу и переименовываем новую
const finalize = `
DROP TABLE attendance;
ALTER TABLE attendance_temp RENAME TO attendance;
`;

db.serialize(() => {
    // Создаем временную таблицу
    db.run(createTempTable, (err) => {
        if (err) {
            console.error('❌ Ошибка создания временной таблицы:', err);
            db.close();
            return;
        }
        console.log('✅ Временная таблица создана');
        
        // Копируем данные
        db.run(copyData, (err) => {
            if (err) {
                console.error('❌ Ошибка копирования данных:', err);
                db.close();
                return;
            }
            console.log('✅ Данные скопированы');
            
            // Завершаем миграцию
            db.run(finalize, (err) => {
                if (err) {
                    console.error('❌ Ошибка завершения миграции:', err);
                } else {
                    console.log('✅ Таблица attendance исправлена!');
                }
                
                db.close();
                console.log('🎉 Миграция завершена!');
            });
        });
    });
});