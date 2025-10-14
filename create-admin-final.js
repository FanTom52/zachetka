const database = require('./database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Используем только существующие колонки
        await database.run(
            `INSERT INTO users (username, password, role) 
             VALUES (?, ?, ?)`,
            ['admin', hashedPassword, 'admin']
        );
        
        console.log('✅ Администратор создан!');
        console.log('👤 Логин: admin');
        console.log('🔑 Пароль: admin123');
        console.log('🎯 Роль: admin');
        
    } catch (error) {
        console.error('❌ Ошибка создания администратора:', error.message);
    }
}

createAdmin();