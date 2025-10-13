// utils/export.js
const ExcelJS = require('exceljs');
const db = require('./database');

class ExportManager {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
    }

    async exportGradesToExcel(groupId, subjectId) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Ведомость оценок');

            // Заголовки
            worksheet.columns = [
                { header: '№', key: 'number', width: 5 },
                { header: 'ФИО студента', key: 'name', width: 30 },
                { header: 'Номер билета', key: 'student_card', width: 15 },
                { header: 'Оценка', key: 'grade', width: 10 },
                { header: 'Тип работы', key: 'grade_type', width: 15 },
                { header: 'Дата', key: 'date', width: 12 },
                { header: 'Преподаватель', key: 'teacher', width: 25 }
            ];

            // Стили для заголовков
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Получаем данные
            const sql = `
                SELECT s.name, s.student_card, g.grade, g.grade_type, g.date, t.name as teacher_name
                FROM students s
                LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ?
                LEFT JOIN teachers t ON g.teacher_id = t.id
                WHERE s.group_id = ?
                ORDER BY s.name
            `;

            return new Promise((resolve, reject) => {
                db.all(sql, [subjectId, groupId], async (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Добавляем данные
                    rows.forEach((row, index) => {
                        worksheet.addRow({
                            number: index + 1,
                            name: row.name,
                            student_card: row.student_card,
                            grade: row.grade || '',
                            grade_type: this.getGradeTypeText(row.grade_type),
                            date: row.date ? new Date(row.date).toLocaleDateString('ru-RU') : '',
                            teacher: row.teacher_name || ''
                        });
                    });

                    // Автофильтр
                    worksheet.autoFilter = {
                        from: 'A1',
                        to: `G${rows.length + 1}`
                    };

                    // Сохраняем файл
                    const buffer = await workbook.xlsx.writeBuffer();
                    resolve(buffer);
                });
            });

        } catch (error) {
            console.error('Ошибка экспорта в Excel:', error);
            throw error;
        }
    }

    async exportStatisticsToExcel() {
        try {
            const workbook = new ExcelJS.Workbook();
            
            // Лист с общей статистикой
            const statsSheet = workbook.addWorksheet('Общая статистика');
            
            statsSheet.columns = [
                { header: 'Показатель', key: 'indicator', width: 25 },
                { header: 'Значение', key: 'value', width: 15 }
            ];

            const statistics = await this.getSystemStatistics();
            
            statsSheet.addRow({ indicator: 'Всего студентов', value: statistics.totalStudents });
            statsSheet.addRow({ indicator: 'Всего преподавателей', value: statistics.totalTeachers });
            statsSheet.addRow({ indicator: 'Всего предметов', value: statistics.totalSubjects });
            statsSheet.addRow({ indicator: 'Всего оценок', value: statistics.totalGrades });
            statsSheet.addRow({ indicator: 'Средний балл', value: statistics.averageGrade });

            // Лист с успеваемостью по группам
            const groupsSheet = workbook.addWorksheet('Успеваемость по группам');
            groupsSheet.columns = [
                { header: 'Группа', key: 'group', width: 15 },
                { header: 'Средний балл', key: 'average', width: 15 },
                { header: 'Успеваемость %', key: 'success_rate', width: 15 },
                { header: 'Кол-во студентов', key: 'students_count', width: 15 }
            ];

            const groupsStats = await this.getGroupsStatistics();
            groupsStats.forEach(stat => {
                groupsSheet.addRow(stat);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;

        } catch (error) {
            console.error('Ошибка экспорта статистики:', error);
            throw error;
        }
    }

    async getSystemStatistics() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM students WHERE status = 'active') as totalStudents,
                    (SELECT COUNT(*) FROM teachers WHERE status = 'active') as totalTeachers,
                    (SELECT COUNT(*) FROM subjects) as totalSubjects,
                    (SELECT COUNT(*) FROM grades) as totalGrades,
                    (SELECT ROUND(AVG(grade), 2) FROM grades) as averageGrade
            `;

            db.get(sql, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getGroupsStatistics() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    g.name as group,
                    ROUND(AVG(gr.grade), 2) as average,
                    ROUND((COUNT(CASE WHEN gr.grade >= 3 THEN 1 END) * 100.0 / COUNT(gr.grade)), 2) as success_rate,
                    COUNT(DISTINCT s.id) as students_count
                FROM groups g
                LEFT JOIN students s ON g.id = s.group_id
                LEFT JOIN grades gr ON s.id = gr.student_id
                GROUP BY g.id
                ORDER BY average DESC
            `;

            db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getGradeTypeText(type) {
        const types = {
            'exam': 'Экзамен',
            'test': 'Зачёт',
            'coursework': 'Курсовая',
            'practice': 'Практика'
        };
        return types[type] || type;
    }
}

module.exports = new ExportManager();