// check-saved-attendance.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка сохраненных данных посещаемости...');

// Проверяем последние записи
db.all("SELECT * FROM attendance ORDER BY id DESC LIMIT 10", (err, records) => {
    if (err) {
        console.error('❌ Ошибка проверки данных:', err);
        db.close();
        return;
    }
    
    console.log(`📊 Последние записи (всего: ${records.length}):`);
    records.forEach(record => {
        console.log(`  ID: ${record.id}, Студент: ${record.student_id}, Предмет: ${record.subject_id}, Дата: ${record.date}, Статус: ${record.status}, Примечания: ${record.notes || 'нет'}`);
    });
    
    db.close();
});