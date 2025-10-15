// check-attendance-table.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка структуры таблицы attendance...');

// Проверим структуру таблицы
db.all("PRAGMA table_info(attendance)", (err, columns) => {
    if (err) {
        console.error('❌ Ошибка проверки таблицы:', err);
        db.close();
        return;
    }
    
    console.log('📋 Структура таблицы attendance:');
    columns.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Проверим существующие записи
    db.all("SELECT COUNT(*) as count FROM attendance", (err, row) => {
        if (err) {
            console.error('❌ Ошибка подсчета записей:', err);
        } else {
            console.log(`📊 Всего записей в таблице: ${row[0].count}`);
        }
        
        db.close();
    });
});