const database = require('./database');

async function debugUsers() {
    try {
        console.log('🔍 Проверяем пользователей и их роли...');
        
        const users = await database.query(`
            SELECT u.*, 
                   s.id as student_id,
                   t.id as teacher_id
            FROM users u
            LEFT JOIN students s ON u.student_id = s.id
            LEFT JOIN teachers t ON u.teacher_id = t.id
        `);
        
        console.log('📋 Все пользователи:');
        users.forEach(user => {
            console.log(`👤 ${user.username} (${user.role})`);
            console.log(`   Student ID: ${user.student_id}, Teacher ID: ${user.teacher_id}`);
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

debugUsers();