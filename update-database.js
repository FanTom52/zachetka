// update-database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gradebook.db');

console.log('🔄 Обновляем структуру базы данных...');

// Добавляем колонки is_pass и notes в таблицу grades
const queries = [
    `ALTER TABLE grades ADD COLUMN is_pass INTEGER CHECK(is_pass IN (0, 1))`,
    `ALTER TABLE grades ADD COLUMN notes TEXT`
];

function runQuery(index) {
    if (index >= queries.length) {
        console.log('✅ База данных успешно обновлена!');
        db.close();
        return;
    }

    const query = queries[index];
    console.log(`📝 Выполняем запрос: ${query}`);

    db.run(query, function(err) {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`ℹ️ Колонка уже существует, пропускаем...`);
            } else {
                console.error(`❌ Ошибка: ${err.message}`);
            }
        } else {
            console.log(`✅ Запрос выполнен успешно`);
        }
        
        // Запускаем следующий запрос
        runQuery(index + 1);
    });
}

// Запускаем первый запрос
runQuery(0);