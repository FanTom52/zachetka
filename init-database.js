const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    try {
        // Подключение без выбора базы данных
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Подключение к MySQL установлено');

        // Создание базы данных
        await connection.execute('CREATE DATABASE IF NOT EXISTS gradebook');
        console.log('✅ База данных gradebook создана');

        // Использование базы данных
        await connection.execute('USE gradebook');
        console.log('✅ Используем базу данных gradebook');

        // Создание таблиц из schema.sql
        const fs = require('fs');
        const schema = fs.readFileSync('./database/schema.sql', 'utf8');
        
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
                console.log('✅ Выполнен SQL statement');
            }
        }

        console.log('🎉 База данных успешно инициализирована!');
        await connection.end();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
}

initializeDatabase();