// routes/gradebook.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

// 📋 Получить ведомость для массового выставления
router.get('/:groupId/:subjectId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { groupId, subjectId } = req.params;
        
        console.log('🔍 Запрос ведомости:', { groupId, subjectId });
        
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
                gr.name as group_name,
                subj.name as subject_name
            FROM students s
            LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ?
            JOIN groups gr ON s.group_id = gr.id
            JOIN subjects subj ON subj.id = ?
            WHERE s.group_id = ?
            ORDER BY s.name
        `;
        
        db.all(sql, [subjectId, subjectId, groupId], (err, rows) => {
            if (err) {
                console.error('❌ Ошибка получения ведомости:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных ведомости'
                });
            }
            
            console.log('✅ Данные ведомости получены:', rows?.length || 0, 'студентов');
            
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
        console.error('❌ Ошибка в маршруте ведомости:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;