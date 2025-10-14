const database = require('./database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await database.run(
            `INSERT INTO users (username, password, name, role) 
             VALUES (?, ?, ?, ?)`,
            ['admin', hashedPassword, 'Главный администратор', 'admin']
        );
        
        console.log('✅ Администратор создан!');
        console.log('Логин: admin');
        console.log('Пароль: admin123');
    } catch (error) {
        console.error('Ошибка создания администратора:', error);
    }
}

createAdmin();