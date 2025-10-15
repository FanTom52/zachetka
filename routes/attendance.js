// routes/attendance.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

// 📊 Получить посещаемость студента
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const sql = `
            SELECT 
                a.*,
                s.name as subject_name,
                t.name as teacher_name,
                gr.name as group_name
            FROM attendance a
            JOIN subjects s ON a.subject_id = s.id
            JOIN teachers t ON a.teacher_id = t.id
            JOIN students st ON a.student_id = st.id
            JOIN groups gr ON st.group_id = gr.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `;
        
        db.all(sql, [studentId], (err, attendance) => {
            if (err) {
                console.error('Ошибка получения посещаемости:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных посещаемости'
                });
            }
            
            res.json({
                success: true,
                data: attendance
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения посещаемости студента:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 📊 Получить посещаемость по группе и предмету (для преподавателей)
router.get('/group/:groupId/subject/:subjectId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        const { groupId, subjectId } = req.params;
        const { date } = req.query;
        
        let sql = `
            SELECT 
                s.id as student_id,
                s.name as student_name,
                s.student_card,
                a.status,
                a.notes,
                a.date
            FROM students s
            LEFT JOIN attendance a ON s.id = a.student_id AND a.subject_id = ? AND a.date = ?
            WHERE s.group_id = ?
            ORDER BY s.name
        `;
        
        db.all(sql, [subjectId, date, groupId], (err, students) => {
            if (err) {
                console.error('Ошибка получения посещаемости группы:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных посещаемости'
                });
            }
            
            res.json({
                success: true,
                data: {
                    students: students,
                    date: date
                }
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения посещаемости группы:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});



// 📈 Статистика посещаемости студента
router.get('/student/:studentId/statistics', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const sql = `
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance 
            WHERE student_id = ?
            GROUP BY status
        `;
        
        db.all(sql, [studentId], (err, stats) => {
            if (err) {
                console.error('Ошибка получения статистики:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения статистики'
                });
            }
            
            // Вычисляем общее количество и проценты
            const total = stats.reduce((sum, item) => sum + item.count, 0);
            const statistics = {
                total: total,
                by_status: stats,
                present_percentage: total > 0 ? Math.round((stats.find(s => s.status === 'present')?.count || 0) / total * 100) : 0,
                absent_percentage: total > 0 ? Math.round((stats.find(s => s.status === 'absent')?.count || 0) / total * 100) : 0
            };
            
            res.json({
                success: true,
                data: statistics
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики посещаемости:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 🧪 ТЕСТОВЫЙ МАРШРУТ - проверить доступность
router.get('/test', (req, res) => {
    console.log('✅ TEST ENDPOINT - Получен запрос');
    res.json({
        success: true,
        message: 'Attendance API работает!',
        timestamp: new Date().toISOString()
    });
});

// ➕ ОСНОВНОЙ РАБОЧИЙ ENDPOINT - Добавить/обновить посещаемость
router.post('/bulk', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
    try {
        console.log('🎯 BULK MAIN - Получен запрос');
        
        const { subject_id, group_id, date, attendance_data } = req.body;
        const teacher_id = req.user.teacher_id || req.user.id;

        console.log('🎯 BULK MAIN - Параметры:', {
            subject_id, group_id, date, teacher_id,
            attendance_count: attendance_data?.length || 0
        });

        if (!subject_id || !group_id || !date || !attendance_data) {
            return res.status(400).json({
                success: false,
                error: 'Все обязательные поля должны быть заполнены'
            });
        }

        let successCount = 0;
        let errorCount = 0;

        // Рабочая версия - используем teacher_id как значение по умолчанию
        for (const attendance of attendance_data) {
            try {
                if (attendance.status) {
                    // Используем INSERT с teacher_id
                    const insertSql = `INSERT INTO attendance (student_id, subject_id, teacher_id, date, status, notes) VALUES (?, ?, ?, ?, ?, ?)`;
                    
                    await new Promise((resolve, reject) => {
                        db.run(insertSql, [
                            attendance.student_id, 
                            subject_id, 
                            teacher_id, // Используем teacher_id из запроса
                            date, 
                            attendance.status, 
                            attendance.notes || ''
                        ], function(err) {
                            if (err) {
                                console.error(`❌ BULK MAIN - Ошибка для студента ${attendance.student_id}:`, err);
                                reject(err);
                            } else {
                                console.log(`✅ BULK MAIN - Добавлена запись для студента ${attendance.student_id}`);
                                resolve();
                            }
                        });
                    });
                    successCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ BULK MAIN - Ошибка для студента ${attendance.student_id}:`, error);
            }
        }

        console.log(`📊 BULK MAIN - Итог: сохранено ${successCount}, ошибок ${errorCount}`);

        res.json({
            success: true,
            message: `Посещаемость сохранена: ${successCount} записей, ошибок: ${errorCount}`,
            data: {
                saved: successCount,
                errors: errorCount
            }
        });
        
    } catch (error) {
        console.error('❌ BULK MAIN - Общая ошибка:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера: ' + error.message
        });
    }
});

module.exports = router;