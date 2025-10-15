const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// 📊 Статистика преподавателя
router.get('/:teacherId/statistics', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Количество студентов у преподавателя
        const studentsCount = await new Promise((resolve, reject) => {
            const sql = `
                SELECT COUNT(DISTINCT s.id) as count 
                FROM students s
                JOIN grades g ON s.id = g.student_id
                WHERE g.teacher_id = ?
            `;
            db.get(sql, [teacherId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });

        // Количество оценок преподавателя
        const gradesCount = await new Promise((resolve, reject) => {
            const sql = 'SELECT COUNT(*) as count FROM grades WHERE teacher_id = ?';
            db.get(sql, [teacherId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });

        // Средний балл преподавателя
        const averageGrade = await new Promise((resolve, reject) => {
            const sql = `
                SELECT AVG(grade) as average 
                FROM grades 
                WHERE teacher_id = ? AND grade IS NOT NULL
            `;
            db.get(sql, [teacherId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.average ? Math.round(row.average * 100) / 100 : 0);
            });
        });

        // Статистика по предметам
        const subjectsStats = await new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    s.id,
                    s.name,
                    COUNT(g.id) as grade_count,
                    AVG(g.grade) as average_grade
                FROM subjects s
                LEFT JOIN grades g ON s.id = g.subject_id AND g.teacher_id = ?
                GROUP BY s.id, s.name
            `;
            db.all(sql, [teacherId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json({
            success: true,
            data: {
                students_count: studentsCount,
                grades_count: gradesCount,
                average_grade: averageGrade,
                subjects_stats: subjectsStats
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики преподавателя:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

// 📝 Последние оценки преподавателя
router.get('/:teacherId/recent-grades', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;

        const sql = `
            SELECT 
                g.*,
                s.name as student_name,
                sub.name as subject_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.teacher_id = ?
            ORDER BY g.date DESC
            LIMIT 10
        `;

        db.all(sql, [teacherId], (err, grades) => {
            if (err) {
                console.error('Ошибка получения последних оценок:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных'
                });
            }

            res.json({
                success: true,
                data: grades || []
            });
        });
    } catch (error) {
        console.error('Ошибка получения последних оценок:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;