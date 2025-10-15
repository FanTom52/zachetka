// routes/grades.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth'); // Изменили requireRole на requireTeacherOrAdmin

// 📊 Получить ведомость по группе и предмету
router.get('/gradebook/:groupId/:subjectId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    // Заменили requireRole(['teacher', 'admin']) на requireTeacherOrAdmin
    try {
        const { groupId, subjectId } = req.params;
        
        const sql = `
            SELECT 
                s.id as student_id,
                s.name as student_name,
                s.student_card,
                g.grade,
                g.grade_type,
                g.is_pass,
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
router.post('/', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    // Заменили requireRole(['teacher', 'admin']) на requireTeacherOrAdmin
    try {
        const { student_id, subject_id, grade, grade_type, date, notes } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        if (!student_id || !subject_id || !grade || !date) {
            return res.status(400).json({
                success: false,
                error: 'Все обязательные поля должны быть заполнены'
            });
        }

        // Для экзаменов проверяем диапазон оценки
        if (grade_type === 'exam' && (grade < 2 || grade > 5)) {
            return res.status(400).json({
                success: false,
                error: 'Оценка для экзамена должна быть в диапазоне от 2 до 5'
            });
        }

        // Проверяем, существует ли уже такая запись
        const checkSql = `SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND grade_type = ?`;
        
        db.get(checkSql, [student_id, subject_id, grade_type], (err, existing) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки существующей записи'
                });
            }

            if (existing) {
                // Обновляем существующую запись
                const updateSql = `UPDATE grades SET grade = ?, date = ?, teacher_id = ?, notes = ? WHERE id = ?`;
                db.run(updateSql, [grade, date, teacher_id, notes, existing.id], function(err) {
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
                // Добавляем новую запись
                const insertSql = `INSERT INTO grades (student_id, subject_id, grade, grade_type, date, teacher_id, notes) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
                db.run(insertSql, [student_id, subject_id, grade, grade_type, date, teacher_id, notes], function(err) {
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

// ➕ Добавить/обновить зачёт - ИСПРАВЛЕННАЯ ВЕРСИЯ
router.post('/credit', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { student_id, subject_id, is_pass, grade_type, date, notes, grade } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        console.log('🔍 DEBUG - Данные зачёта:', { 
            student_id, 
            subject_id, 
            is_pass, 
            grade_type, 
            date, 
            notes, 
            grade,
            teacher_id 
        });

        // Проверяем обязательные поля
        if (!student_id || !subject_id || !grade_type || !date) {
            return res.status(400).json({
                success: false,
                error: 'Не хватает обязательных полей: студент, предмет, тип зачёта и дата'
            });
        }

        // Проверяем тип зачёта
        if (grade_type !== 'test' && grade_type !== 'credit') {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип зачёта. Допустимые значения: test, credit'
            });
        }

        let insertSql, params;

        // Для обычного зачёта
        if (grade_type === 'test') {
            if (is_pass === undefined || is_pass === null) {
                return res.status(400).json({
                    success: false,
                    error: 'Для зачёта укажите результат (зачёт/незачёт)'
                });
            }
            
            insertSql = `INSERT INTO grades (student_id, subject_id, is_pass, grade_type, date, teacher_id, notes) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
            params = [student_id, subject_id, is_pass, grade_type, date, teacher_id, notes || ''];
        } 
        // Для дифференцированного зачёта
        else if (grade_type === 'credit') {
            if (!grade) {
                return res.status(400).json({
                    success: false,
                    error: 'Для дифференцированного зачёта укажите оценку'
                });
            }
            if (grade < 2 || grade > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Оценка для дифференцированного зачёта должна быть от 2 до 5'
                });
            }
            
            insertSql = `INSERT INTO grades (student_id, subject_id, grade, grade_type, date, teacher_id, notes) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
            params = [student_id, subject_id, grade, grade_type, date, teacher_id, notes || ''];
        }

        // Проверяем, существует ли уже такая запись
        const checkSql = `SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND grade_type = ?`;
        
        db.get(checkSql, [student_id, subject_id, grade_type], (err, existing) => {
            if (err) {
                console.error('❌ Ошибка проверки существующей записи:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки существующей записи: ' + err.message
                });
            }

            if (existing) {
                // Обновляем существующую запись
                let updateSql, updateParams;
                
                if (grade_type === 'credit') {
                    updateSql = `UPDATE grades SET grade = ?, date = ?, teacher_id = ?, notes = ? WHERE id = ?`;
                    updateParams = [grade, date, teacher_id, notes || '', existing.id];
                } else {
                    updateSql = `UPDATE grades SET is_pass = ?, date = ?, teacher_id = ?, notes = ? WHERE id = ?`;
                    updateParams = [is_pass, date, teacher_id, notes || '', existing.id];
                }
                
                db.run(updateSql, updateParams, function(err) {
                    if (err) {
                        console.error('❌ Ошибка обновления зачёта:', err);
                        return res.status(500).json({
                            success: false,
                            error: 'Ошибка обновления зачёта: ' + err.message
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Зачёт успешно обновлён',
                        data: { id: existing.id }
                    });
                });
            } else {
                // Добавляем новую запись
                db.run(insertSql, params, function(err) {
                    if (err) {
                        console.error('❌ Ошибка добавления зачёта:', err);
                        return res.status(500).json({
                            success: false,
                            error: 'Ошибка добавления зачёта: ' + err.message
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Зачёт успешно добавлен',
                        data: { id: this.lastID }
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Неожиданная ошибка добавления зачёта:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера: ' + error.message
        });
    }
});

// 📝 Получить оценки преподавателя
router.get('/teacher/:teacherId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const sql = `
            SELECT 
                g.*,
                s.name as student_name,
                sub.name as subject_name,
                gr.name as group_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN subjects sub ON g.subject_id = sub.id
            LEFT JOIN groups gr ON s.group_id = gr.id
            WHERE g.teacher_id = ?
            ORDER BY g.date DESC
            LIMIT 20
        `;
        
        db.all(sql, [teacherId], (err, grades) => {
            if (err) {
                console.error('Ошибка получения оценок преподавателя:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения оценок'
                });
            }
            
            res.json({
                success: true,
                data: grades || []
            });
        });
        
    } catch (error) {
        console.error('Ошибка в маршруте оценок преподавателя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 📊 Получить все оценки и зачёты студента
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const sql = `
            SELECT 
                g.*,
                s.name as subject_name,
                t.name as teacher_name,
                gr.name as group_name,
                st.name as student_name
            FROM grades g
            JOIN subjects s ON g.subject_id = s.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            JOIN students st ON g.student_id = st.id
            LEFT JOIN groups gr ON st.group_id = gr.id
            WHERE g.student_id = ?
            ORDER BY g.date DESC
        `;
        
        db.all(sql, [studentId], (err, rows) => {
            if (err) {
                console.error('Ошибка получения оценок:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных'
                });
            }
            
            res.json({
                success: true,
                data: rows
            });
        });
        
    } catch (error) {
        console.error('Ошибка в маршруте оценок студента:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 🗑️ Удалить оценку/зачёт
router.delete('/:gradeId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { gradeId } = req.params;
        const teacherId = req.user.teacher_id || req.user.id;

        // Сначала проверяем, существует ли оценка и принадлежит ли она преподавателю
        const checkSql = `SELECT * FROM grades WHERE id = ? AND teacher_id = ?`;
        
        db.get(checkSql, [gradeId, teacherId], (err, grade) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки оценки'
                });
            }

            if (!grade) {
                return res.status(404).json({
                    success: false,
                    error: 'Оценка не найдена или у вас нет прав для её удаления'
                });
            }

            // Удаляем оценку
            const deleteSql = `DELETE FROM grades WHERE id = ?`;
            db.run(deleteSql, [gradeId], function(err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка удаления оценки'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Оценка успешно удалена'
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка удаления оценки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 🐛 ОТЛАДОЧНЫЙ МАРШРУТ - проверить доступность
router.get('/debug-test', (req, res) => {
    console.log('✅ Маршрут /api/grades/debug-test работает!');
    res.json({ 
        success: true, 
        message: 'Маршрут grades работает',
        timestamp: new Date().toISOString()
    });
});

// 🐛 ОТЛАДОЧНЫЙ МАРШРУТ - проверить структуру данных
router.post('/debug', authenticateToken, (req, res) => {
    console.log('🔍 Получены данные:', req.body);
    console.log('🔍 Заголовки:', req.headers);
    
    res.json({
        success: true,
        received: req.body,
        message: 'Данные получены успешно'
    });
});

// 📝 Получить данные конкретной оценки
router.get('/:gradeId', authenticateToken, async (req, res) => {
    try {
        const { gradeId } = req.params;
        
        const sql = `
            SELECT 
                g.*,
                s.name as student_name,
                sub.name as subject_name,
                t.name as teacher_name,
                gr.name as group_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN subjects sub ON g.subject_id = sub.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            LEFT JOIN groups gr ON s.group_id = gr.id
            WHERE g.id = ?
        `;
        
        db.get(sql, [gradeId], (err, grade) => {
            if (err) {
                console.error('Ошибка получения оценки:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных оценки'
                });
            }
            
            if (!grade) {
                return res.status(404).json({
                    success: false,
                    error: 'Оценка не найдена'
                });
            }
            
            res.json({
                success: true,
                data: grade
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения оценки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ✏️ Обновить оценку
router.put('/:gradeId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { grade, is_pass, date, notes } = req.body;
        const teacherId = req.user.teacher_id || req.user.id;

        // Проверяем, существует ли оценка и принадлежит ли она преподавателю
        const checkSql = `SELECT * FROM grades WHERE id = ? AND teacher_id = ?`;
        
        db.get(checkSql, [gradeId, teacherId], (err, existingGrade) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки оценки'
                });
            }

            if (!existingGrade) {
                return res.status(404).json({
                    success: false,
                    error: 'Оценка не найдена или у вас нет прав для её редактирования'
                });
            }

            // Подготавливаем данные для обновления
            let updateFields = [];
            let updateValues = [];

            if (grade !== undefined) {
                updateFields.push('grade = ?');
                updateValues.push(grade);
            }

            if (is_pass !== undefined) {
                updateFields.push('is_pass = ?');
                updateValues.push(is_pass);
            }

            if (date) {
                updateFields.push('date = ?');
                updateValues.push(date);
            }

            if (notes !== undefined) {
                updateFields.push('notes = ?');
                updateValues.push(notes);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Нет данных для обновления'
                });
            }

            updateValues.push(gradeId);

            const updateSql = `UPDATE grades SET ${updateFields.join(', ')} WHERE id = ?`;
            
            db.run(updateSql, updateValues, function(err) {
                if (err) {
                    console.error('Ошибка обновления оценки:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка обновления оценки'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Оценка успешно обновлена',
                    data: { id: gradeId }
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка обновления оценки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;