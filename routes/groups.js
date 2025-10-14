// routes/groups.js - БЕЗ АВТОРИЗАЦИИ ДЛЯ ТЕСТА
const express = require('express');
const router = express.Router();

// 📋 Получить все группы - БЕЗ АВТОРИЗАЦИИ
router.get('/', async (req, res) => {
    try {
        // Тестовые данные
        res.json({
            success: true,
            data: [
                {
                    id: 1,
                    name: "Т-101",
                    curator: "Иванова М.П.",
                    student_count: 25,
                    average_grade: 4.3
                },
                {
                    id: 2,
                    name: "Т-102", 
                    curator: "Петров С.И.",
                    student_count: 23,
                    average_grade: 4.1
                },
                {
                    id: 3,
                    name: "Т-103",
                    curator: "Сидорова О.Л.", 
                    student_count: 22,
                    average_grade: 4.0
                }
            ]
        });

    } catch (error) {
        console.error('Ошибка получения групп:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка групп'
        });
    }
});

module.exports = router;