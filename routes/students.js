// routes/students.js - БЕЗ АВТОРИЗАЦИИ ДЛЯ ТЕСТА
const express = require('express');
const router = express.Router();

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

module.exports = router;