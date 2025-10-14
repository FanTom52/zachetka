const database = require('./database');

async function checkSubjectsStructure() {
    try {
        console.log('🔍 Проверяем структуру таблицы subjects...');
        
        const structure = await database.query(`PRAGMA table_info(subjects)`);
        console.log('📋 Структура таблицы subjects:');
        structure.forEach(column => {
            console.log(`   ${column.name} (${column.type})`);
        });
        
        // Проверим есть ли связь с группами через другую таблицу
        console.log('\n🔍 Проверяем связи предметов с группами...');
        const subjectsWithGroups = await database.query(`
            SELECT s.*, sg.group_id 
            FROM subjects s 
            LEFT JOIN subject_groups sg ON s.id = sg.subject_id 
            LIMIT 5
        `);
        
        console.log('Предметы с группами:', subjectsWithGroups);
        
    } catch (error) {
        console.log('❌ Ошибка при проверке:', error.message);
        
        // Проверим другие возможные связи
        console.log('\n🔍 Проверяем другие таблицы...');
        const tables = await database.query(`
            SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%group%' OR name LIKE '%subject%'
        `);
        console.log('Таблицы связанные с группами и предметами:', tables);
    }
}

checkSubjectsStructure();