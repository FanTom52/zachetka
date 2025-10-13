// routes/grades.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 📊 Получить ведомость по группе и предмету
router.get('/gradebook/:groupId/:subjectId', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { groupId, subjectId } = req.params;
        
        const sql = `
            SELECT 
                s.id as student_id,
                s.name as student_name,
                s.student_card,
                g.grade,
                g.grade_type,
                g.date,
                g.teacher_id,
                t.name as teacher_name,
                gr.name as group_name,
                subj.name as subject_name
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ?
            LEFT JOIN teachers t ON g.teacher_id = t.id
            JOIN groups gr ON s.group_id = gr.id
            JOIN subjects subj ON subj.id = ?
            WHERE s.group_id = ?
            ORDER BY s.name
        `;
        
        db.all(sql, [subjectId, subjectId, groupId], (err, rows) => {
            if (err) {
                console.error('Ошибка получения ведомости:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных ведомости'
                });
            }
            
            res.json({
                success: true,
                data: {
                    group: rows[0]?.group_name,
                    subject: rows[0]?.subject_name,
                    students: rows
                }
            });
        });
        
    } catch (error) {
        console.error('Ошибка в маршруте ведомости:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ➕ Добавить/обновить оценку
router.post('/', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { student_id, subject_id, grade, grade_type, date } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        if (!student_id || !subject_id || !grade || !date) {
            return res.status(400).json({
                success: false,
                error: 'Все обязательные поля должны быть заполнены'
            });
        }

        if (grade < 2 || grade > 5) {
            return res.status(400).json({
                success: false,
                error: 'Оценка должна быть в диапазоне от 2 до 5'
            });
        }

        // Проверяем, существует ли уже такая оценка
        const checkSql = `SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND grade_type = ?`;
        
        db.get(checkSql, [student_id, subject_id, grade_type], (err, existing) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки существующей оценки'
                });
            }

            if (existing) {
                // Обновляем существующую оценку
                const updateSql = `UPDATE grades SET grade = ?, date = ?, teacher_id = ? WHERE id = ?`;
                db.run(updateSql, [grade, date, teacher_id, existing.id], function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            error: 'Ошибка обновления оценки'
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Оценка успешно обновлена',
                        data: { id: existing.id }
                    });
                });
            } else {
                // Добавляем новую оценку
                const insertSql = `INSERT INTO grades (student_id, subject_id, grade, grade_type, date, teacher_id) 
                                 VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(insertSql, [student_id, subject_id, grade, grade_type, date, teacher_id], function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            error: 'Ошибка добавления оценки'
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Оценка успешно добавлена',
                        data: { id: this.lastID }
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('Ошибка добавления оценки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;