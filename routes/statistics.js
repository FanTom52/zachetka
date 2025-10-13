// routes/statistics.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// 📊 Общая статистика системы
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const statistics = {};
        
        // Получаем количество студентов
        db.get('SELECT COUNT(*) as count FROM students WHERE status = "active"', (err, studentRow) => {
            if (err) throw err;
            statistics.students = studentRow.count;
            
            // Получаем количество преподавателей
            db.get('SELECT COUNT(*) as count FROM teachers WHERE status = "active"', (err, teacherRow) => {
                if (err) throw err;
                statistics.teachers = teacherRow.count;
                
                // Получаем количество предметов
                db.get('SELECT COUNT(*) as count FROM subjects', (err, subjectRow) => {
                    if (err) throw err;
                    statistics.subjects = subjectRow.count;
                    
                    // Получаем количество оценок
                    db.get('SELECT COUNT(*) as count FROM grades', (err, gradeRow) => {
                        if (err) throw err;
                        statistics.grades = gradeRow.count;
                        
                        // Получаем количество групп
                        db.get('SELECT COUNT(*) as count FROM groups', (err, groupRow) => {
                            if (err) throw err;
                            statistics.groups = groupRow.count;
                            
                            // Средний балл по системе
                            db.get('SELECT AVG(grade) as average FROM grades', (err, avgRow) => {
                                statistics.averageGrade = avgRow.average ? Math.round(avgRow.average * 100) / 100 : 0;
                                
                                res.json({
                                    success: true,
                                    data: statistics
                                });
                            });
                        });
                    });
                });
            });
        });

    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

// 📈 Статистика по группе
router.get('/group/:groupId', authenticateToken, requirePermission('view_statistics'), async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const sql = `
            SELECT 
                s.name as subject_name,
                COUNT(DISTINCT st.id) as total_students,
                COUNT(g.id) as total_grades,
                ROUND(AVG(g.grade), 2) as average_grade,
                COUNT(CASE WHEN g.grade = 5 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN g.grade = 4 THEN 1 END) as good_count,
                COUNT(CASE WHEN g.grade = 3 THEN 1 END) as satisfactory_count,
                COUNT(CASE WHEN g.grade = 2 THEN 1 END) as fail_count,
                ROUND((COUNT(CASE WHEN g.grade >= 3 THEN 1 END) * 100.0 / COUNT(g.id)), 2) as success_rate
            FROM subjects s
            LEFT JOIN curriculum c ON s.id = c.subject_id AND c.group_id = ?
            LEFT JOIN grades g ON s.id = g.subject_id
            LEFT JOIN students st ON g.student_id = st.id AND st.group_id = ?
            WHERE c.group_id = ? OR c.group_id IS NULL
            GROUP BY s.id
            ORDER BY s.name
        `;
        
        db.all(sql, [groupId, groupId, groupId], (err, rows) => {
            if (err) {
                console.error('Ошибка получения статистики группы:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения статистики группы'
                });
            }

            // Общая статистика по группе
            const overallStats = rows.reduce((acc, row) => ({
                totalSubjects: acc.totalSubjects + 1,
                totalGrades: acc.totalGrades + row.total_grades,
                weightedAverage: acc.weightedAverage + (row.average_grade * row.total_grades),
                totalWeight: acc.totalWeight + row.total_grades,
                excellentStudents: Math.max(acc.excellentStudents, row.excellent_count),
                totalStudents: Math.max(acc.totalStudents, row.total_students)
            }), { 
                totalSubjects: 0, 
                totalGrades: 0, 
                weightedAverage: 0, 
                totalWeight: 0,
                excellentStudents: 0,
                totalStudents: 0
            });

            const overallAverage = overallStats.totalWeight > 0 
                ? Math.round((overallStats.weightedAverage / overallStats.totalWeight) * 100) / 100 
                : 0;

            res.json({
                success: true,
                data: {
                    subjects: rows,
                    overall: {
                        totalSubjects: overallStats.totalSubjects,
                        totalGrades: overallStats.totalGrades,
                        averageGrade: overallAverage,
                        totalStudents: overallStats.totalStudents,
                        excellentCount: overallStats.excellentStudents
                    }
                }
            });
        });

    } catch (error) {
        console.error('Ошибка получения статистики группы:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики группы'
        });
    }
});

module.exports = router;