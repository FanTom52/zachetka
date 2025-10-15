// verify-attendance-table.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка таблицы attendance...');

// Проверяем структуру
db.all("PRAGMA table_info(attendance)", (err, columns) => {
    if (err) {
        console.error('❌ Ошибка проверки структуры:', err);
        db.close();
        return;
    }
    
    console.log('📋 Структура таблицы:');
    const columnNames = columns.map(col => col.name);
    console.log('  Колонки:', columnNames.join(', '));
    
    // Проверяем данные
    db.all("SELECT * FROM attendance", (err, records) => {
        if (err) {
            console.error('❌ Ошибка проверки данных:', err);
        } else {
            console.log(`📊 Записей в таблице: ${records.length}`);
            records.forEach(record => {
                console.log(`  ID: ${record.id}, Студент: ${record.student_id}, Преподаватель: ${record.teacher_id}, Статус: ${record.status}`);
            });
        }
        
        db.close();
    });
});