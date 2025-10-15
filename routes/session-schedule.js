// routes/session-schedule.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireTeacherOrAdmin, requireAdmin } = require('../middleware/auth');

// 📅 Получить расписание сессии для студента (по его группе)
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Получаем группу студента
        const studentSql = `SELECT group_id FROM students WHERE id = ?`;
        
        db.get(studentSql, [studentId], (err, student) => {
            if (err) {
                console.error('Ошибка получения студента:', err);
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
            
            // Получаем расписание для группы студента
            const scheduleSql = `
                SELECT 
                    ss.*,
                    s.name as subject_name,
                    g.name as group_name,
                    t.name as teacher_name
                FROM session_schedule ss
                JOIN subjects s ON ss.subject_id = s.id
                JOIN groups g ON ss.group_id = g.id
                JOIN teachers t ON ss.teacher_id = t.id
                WHERE ss.group_id = ?
                ORDER BY ss.event_date, ss.start_time
            `;
            
            db.all(scheduleSql, [student.group_id], (err, schedule) => {
                if (err) {
                    console.error('Ошибка получения расписания:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка получения расписания'
                    });
                }
                
                res.json({
                    success: true,
                    data: schedule
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения расписания студента:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 📅 Получить расписание сессии для преподавателя
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const sql = `
            SELECT 
                ss.*,
                s.name as subject_name,
                g.name as group_name,
                t.name as teacher_name
            FROM session_schedule ss
            JOIN subjects s ON ss.subject_id = s.id
            JOIN groups g ON ss.group_id = g.id
            JOIN teachers t ON ss.teacher_id = t.id
            WHERE ss.teacher_id = ?
            ORDER BY ss.event_date, ss.start_time
        `;
        
        db.all(sql, [teacherId], (err, schedule) => {
            if (err) {
                console.error('Ошибка получения расписания преподавателя:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения расписания'
                });
            }
            
            res.json({
                success: true,
                data: schedule
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения расписания преподавателя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 📅 Получить всё расписание сессии (для админов)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT 
                ss.*,
                s.name as subject_name,
                g.name as group_name,
                t.name as teacher_name
            FROM session_schedule ss
            JOIN subjects s ON ss.subject_id = s.id
            JOIN groups g ON ss.group_id = g.id
            JOIN teachers t ON ss.teacher_id = t.id
            ORDER BY ss.event_date, ss.start_time
        `;
        
        db.all(sql, [], (err, schedule) => {
            if (err) {
                console.error('Ошибка получения расписания:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения расписания'
                });
            }
            
            res.json({
                success: true,
                data: schedule
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения расписания:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ➕ Добавить событие в расписание (преподаватели и админы)
router.post('/', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { subject_id, group_id, event_type, event_date, start_time, end_time, classroom, notes } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        // Проверяем обязательные поля
        if (!subject_id || !group_id || !event_type || !event_date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                error: 'Все обязательные поля должны быть заполнены'
            });
        }

        // Проверяем корректность типа события
        const validEventTypes = ['exam', 'test', 'credit', 'consultation'];
        if (!validEventTypes.includes(event_type)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип события'
            });
        }

        const sql = `
            INSERT INTO session_schedule 
            (subject_id, group_id, teacher_id, event_type, event_date, start_time, end_time, classroom, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [subject_id, group_id, teacher_id, event_type, event_date, start_time, end_time, classroom, notes], function(err) {
            if (err) {
                console.error('Ошибка добавления события:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка добавления события в расписание'
                });
            }
            
            res.json({
                success: true,
                message: 'Событие успешно добавлено в расписание',
                data: { id: this.lastID }
            });
        });
        
    } catch (error) {
        console.error('Ошибка добавления события:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// ✏️ Обновить событие (преподаватели и админы)
router.put('/:eventId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { subject_id, group_id, event_type, event_date, start_time, end_time, classroom, notes } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        // Проверяем, существует ли событие и принадлежит ли оно преподавателю (если не админ)
        const checkSql = `SELECT * FROM session_schedule WHERE id = ?`;
        
        db.get(checkSql, [eventId], (err, event) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки события'
                });
            }

            if (!event) {
                return res.status(404).json({
                    success: false,
                    error: 'Событие не найдено'
                });
            }

            // Если пользователь не админ, проверяем что событие принадлежит ему
            if (req.user.role !== 'admin' && event.teacher_id !== teacher_id) {
                return res.status(403).json({
                    success: false,
                    error: 'У вас нет прав для редактирования этого события'
                });
            }

            const updateSql = `
                UPDATE session_schedule 
                SET subject_id = ?, group_id = ?, event_type = ?, event_date = ?, start_time = ?, end_time = ?, classroom = ?, notes = ?
                WHERE id = ?
            `;
            
            db.run(updateSql, [subject_id, group_id, event_type, event_date, start_time, end_time, classroom, notes, eventId], function(err) {
                if (err) {
                    console.error('Ошибка обновления события:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка обновления события'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Событие успешно обновлено'
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка обновления события:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 🗑️ Удалить событие (преподаватели и админы)
router.delete('/:eventId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { eventId } = req.params;
        const teacher_id = req.user.teacher_id || req.user.id;

        // Проверяем, существует ли событие и принадлежит ли оно преподавателю (если не админ)
        const checkSql = `SELECT * FROM session_schedule WHERE id = ?`;
        
        db.get(checkSql, [eventId], (err, event) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка проверки события'
                });
            }

            if (!event) {
                return res.status(404).json({
                    success: false,
                    error: 'Событие не найдено'
                });
            }

            // Если пользователь не админ, проверяем что событие принадлежит ему
            if (req.user.role !== 'admin' && event.teacher_id !== teacher_id) {
                return res.status(403).json({
                    success: false,
                    error: 'У вас нет прав для удаления этого события'
                });
            }

            const deleteSql = `DELETE FROM session_schedule WHERE id = ?`;
            
            db.run(deleteSql, [eventId], function(err) {
                if (err) {
                    console.error('Ошибка удаления события:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка удаления события'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Событие успешно удалено'
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка удаления события:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;