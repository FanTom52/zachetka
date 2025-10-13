// routes/subjects.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// 📚 Получить список предметов
router.get('/', authenticateToken, requirePermission('view_subjects'), async (req, res) => {
    try {
        const sql = `
            SELECT s.*, t.name as teacher_name, t.department
            FROM subjects s 
            LEFT JOIN teachers t ON s.teacher_id = t.id 
            ORDER BY s.name
        `;
        
        db.all(sql, (err, rows) => {
            if (err) {
                console.error('Ошибка получения предметов:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных предметов'
                });
            }

            res.json({
                success: true,
                data: rows
            });
        });

    } catch (error) {
        console.error('Ошибка в маршруте предметов:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ➕ Добавить предмет
router.post('/', authenticateToken, requirePermission('edit_subjects'), async (req, res) => {
    try {
        const { name, code, hours_total, hours_lecture, hours_practice, semester, teacher_id, description } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                error: 'Название и код предмета обязательны'
            });
        }

        const sql = `
            INSERT INTO subjects (name, code, hours_total, hours_lecture, hours_practice, semester, teacher_id, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [name, code, hours_total, hours_lecture, hours_practice, semester, teacher_id, description], function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка добавления предмета'
                });
            }

            res.json({
                success: true,
                message: 'Предмет успешно добавлен',
                data: { id: this.lastID }
            });
        });

    } catch (error) {
        console.error('Ошибка добавления предмета:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;