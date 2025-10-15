// recreate-attendance-table.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Пересоздание таблицы attendance...');

const dropTable = `DROP TABLE IF EXISTS attendance`;

const createTable = `
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

db.serialize(() => {
    db.run(dropTable);
    db.run(createTable, (err) => {
        if (err) {
            console.error('❌ Ошибка создания таблицы:', err);
        } else {
            console.log('✅ Таблица attendance создана заново!');
        }
        db.close();
    });
});