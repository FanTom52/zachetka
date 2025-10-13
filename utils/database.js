// utils/database.js
const sqlite3 = require('sqlite3').verbose();

// Простая обертка для работы с базой данных
const db = new sqlite3.Database('./gradebook.db', (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключение к базе данных успешно');
    }
});

module.exports = db;