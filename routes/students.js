// routes/students.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// 📋 Получить список студентов
router.get('/', authenticateToken, requirePermission('view_students'), async (req, res) => {
    try {
        const { group, search, page = 1, limit = 20 } = req.query;
        
        let sql = `
            SELECT s.*, g.name as group_name, g.specialization
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE 1=1
        `;
        const params = [];

        if (group) {
            sql += ' AND s.group_id = ?';
            params.push(group);
        }

        if (search) {
            sql += ' AND (s.name LIKE ? OR s.student_card LIKE ? OR s.email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY s.name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Ошибка получения студентов:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных студентов'
                });
            }

            // Получаем общее количество для пагинации
            let countSql = 'SELECT COUNT(*) as total FROM students WHERE 1=1';
            const countParams = [];
            
            if (group) {
                countSql += ' AND group_id = ?';
                countParams.push(group);
            }

            db.get(countSql, countParams, (countErr, countRow) => {
                if (countErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка получения количества студентов'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        students: rows,
                        pagination: {
                            total: countRow.total,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            pages: Math.ceil(countRow.total / parseInt(limit))
                        }
                    }
                });
            });
        });

    } catch (error) {
        console.error('Ошибка в маршруте студентов:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ➕ Добавить студента
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { name, group_id, student_card, email, phone, birth_date } = req.body;

        // Валидация
        if (!name || !group_id || !student_card) {
            return res.status(400).json({
                success: false,
                error: 'Обязательные поля: ФИО, группа, номер билета'
            });
        }

        // Проверяем уникальность номера студенческого билета
        db.get('SELECT id FROM students WHERE student_card = ?', [student_card], (err, existing) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки данных'
                });
            }

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Студент с таким номером билета уже существует'
                });
            }

            // Добавляем студента
            const sql = `INSERT INTO students (name, group_id, student_card, email, phone, birth_date) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
            
            db.run(sql, [name, group_id, student_card, email, phone, birth_date], function(err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка добавления студента'
                    });
                }

                res.json({
                    success: true,
                    message: 'Студент успешно добавлен',
                    data: { id: this.lastID }
                });
            });
        });

    } catch (error) {
        console.error('Ошибка добавления студента:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 👤 Получить профиль студента
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.id;

        // Проверяем права доступа
        if (req.user.role === 'student' && req.user.student_id != studentId) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const sql = `
            SELECT s.*, g.name as group_name, g.specialization, g.course
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE s.id = ?
        `;

        db.get(sql, [studentId], (err, student) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных студента'
                });
            }

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: 'Студент не найден'
                });
            }

            res.json({
                success: true,
                data: student
            });
        });

    } catch (error) {
        console.error('Ошибка получения профиля студента:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;