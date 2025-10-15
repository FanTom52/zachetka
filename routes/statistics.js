const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// 📊 Общая статистика системы
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        // Получаем общее количество пользователей
        const usersCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Получаем количество студентов
        const studentsCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Получаем количество преподавателей
        const teachersCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM teachers', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Получаем количество оценок
        const gradesCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM grades', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        res.json({
            success: true,
            data: {
                users: usersCount,
                students: studentsCount,
                teachers: teachersCount,
                grades: gradesCount
            }
        });
    } catch (error) {
        console.error('Ошибка получения общей статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

module.exports = router;