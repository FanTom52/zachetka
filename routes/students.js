// routes/students.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth'); 

// 📋 Получить всех студентов - БЕЗ АВТОРИЗАЦИИ
router.get('/', async (req, res) => {
    try {
        // Тестовые данные
        res.json({
            success: true,
            data: [
                {
                    id: 1,
                    name: "Иванов Иван",
                    group_name: "Т-101",
                    average_grade: 4.5,
                    grades_count: 10
                },
                {
                    id: 2, 
                    name: "Петрова Анна",
                    group_name: "Т-101", 
                    average_grade: 4.2,
                    grades_count: 8
                },
                {
                    id: 3,
                    name: "Сидоров Петр",
                    group_name: "Т-102",
                    average_grade: 3.8,
                    grades_count: 12
                }
            ]
        });

    } catch (error) {
        console.error('Ошибка получения студентов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка студентов'
        });
    }
});

// 📋 Получить студентов группы
router.get('/group/:groupId', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const sql = `
            SELECT id, name, student_card, email
            FROM students 
            WHERE group_id = ?
            ORDER BY name
        `;
        
        db.all(sql, [groupId], (err, students) => {
            if (err) {
                console.error('Ошибка получения студентов:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных студентов'
                });
            }
            
            res.json({
                success: true,
                data: students
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения студентов группы:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;