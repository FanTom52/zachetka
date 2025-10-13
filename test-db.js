const db = require('./database');

// Тестируем подключение
db.all('SELECT 1 as test', [], (err, rows) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
    } else {
        console.log('✅ Подключение к БД работает:', rows);
    }
});