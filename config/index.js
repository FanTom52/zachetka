// config/index.js
require('dotenv').config();

const config = {
    // Настройки сервера
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    
    // Настройки базы данных
    database: {
        path: process.env.DB_PATH || './gradebook.db',
        backupPath: process.env.DB_BACKUP_PATH || './backups/'
    },
    
    // Настройки безопасности
    security: {
        jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    },
    
    // Настройки академического года
    academic: {
        currentSemester: process.env.CURRENT_SEMESTER || 1,
        academicYear: process.env.ACADEMIC_YEAR || '2024-2025',
        gradeScale: {
            min: 2,
            max: 5,
            passing: 3
        }
    },
    
    // Настройки логирования
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log'
    }
};

module.exports = config;