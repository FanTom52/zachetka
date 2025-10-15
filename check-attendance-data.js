// check-attendance-data.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка данных в таблице attendance...');

// Посмотрим все уникальные статусы
db.all("SELECT DISTINCT status, COUNT(*) as count FROM attendance GROUP BY status", (err, rows) => {
    if (err) {
        console.error('❌ Ошибка проверки статусов:', err);
        db.close();
        return;
    }
    
    console.log('📊 Уникальные статусы:');
    rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count} записей`);
    });
    
    // Посмотрим несколько записей
    db.all("SELECT * FROM attendance LIMIT 5", (err, records) => {
        if (err) {
            console.error('❌ Ошибка получения записей:', err);
        } else {
            console.log('📋 Примеры записей:');
            records.forEach(record => {
                console.log(`  ID: ${record.id}, Студент: ${record.student_id}, Статус: "${record.status}", Дата: ${record.date}`);
            });
        }
        
        db.close();
    });
});