// routes/groups.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 📋 Получить список всех групп
router.get('/', authenticateToken, async (req, res) => {
    try {
        const sql = `SELECT * FROM groups ORDER BY name`;
        
        db.all(sql, (err, rows) => {
            if (err) {
                console.error('Ошибка получения групп:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных групп'
                });
            }

            res.json({
                success: true,
                data: rows
            });
        });

    } catch (error) {
        console.error('Ошибка в маршруте групп:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ➕ Добавить новую группу
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { name, course, specialization } = req.body;

        if (!name || !course) {
            return res.status(400).json({
                success: false,
                error: 'Название и курс группы обязательны'
            });
        }

        const sql = `INSERT INTO groups (name, course, specialization) VALUES (?, ?, ?)`;
        
        db.run(sql, [name, course, specialization], function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка добавления группы'
                });
            }

            res.json({
                success: true,
                message: 'Группа успешно добавлена',
                data: { id: this.lastID }
            });
        });

    } catch (error) {
        console.error('Ошибка добавления группы:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 📊 Статистика по группе
router.get('/:id/statistics', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;

        const sql = `
            SELECT 
                COUNT(DISTINCT s.id) as total_students,
                COUNT(g.id) as total_grades,
                ROUND(AVG(g.grade), 2) as average_grade,
                COUNT(CASE WHEN g.grade = 5 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN g.grade = 4 THEN 1 END) as good_count,
                COUNT(CASE WHEN g.grade = 3 THEN 1 END) as satisfactory_count,
                COUNT(CASE WHEN g.grade = 2 THEN 1 END) as fail_count
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id
            WHERE s.group_id = ?
        `;
        
        db.get(sql, [groupId], (err, stats) => {
            if (err) {
                console.error('Ошибка получения статистики группы:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения статистики'
                });
            }

            res.json({
                success: true,
                data: stats
            });
        });

    } catch (error) {
        console.error('Ошибка получения статистики группы:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;