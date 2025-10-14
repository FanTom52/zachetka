const database = require('./database');

async function checkDatabase() {
    try {
        console.log('🔍 Проверяем структуру базы данных...');
        
        // Смотрим структуру таблицы users
        const usersStructure = await database.query(`
            PRAGMA table_info(users)
        `);
        
        console.log('📋 Структура таблицы users:');
        usersStructure.forEach(column => {
            console.log(`   ${column.name} (${column.type})`);
        });
        
        // Проверяем существующие таблицы
        const tables = await database.query(`
            SELECT name FROM sqlite_master WHERE type='table'
        `);
        
        console.log('\n📊 Все таблицы в базе:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
    } catch (error) {
        console.error('Ошибка проверки базы:', error);
    }
}

checkDatabase();