// routes/debug.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');

// Проверка структуры БД
router.get('/database', async (req, res) => {
    try {
        // Получаем список таблиц
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Получаем структуру каждой таблицы
        const tableStructures = {};
        for (let table of tables) {
            const structure = await new Promise((resolve, reject) => {
                db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            tableStructures[table.name] = structure;
        }

        res.json({
            success: true,
            tables: tables,
            structures: tableStructures
        });

    } catch (error) {
        console.error('Ошибка проверки БД:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Проверка данных студентов
router.get('/students', async (req, res) => {
    try {
        const students = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM students LIMIT 5', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            success: true,
            data: students
        });

    } catch (error) {
        console.error('Ошибка получения студентов:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Проверка данных групп
router.get('/groups', async (req, res) => {
    try {
        const groups = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM groups LIMIT 5', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            success: true,
            data: groups
        });

    } catch (error) {
        console.error('Ошибка получения групп:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;