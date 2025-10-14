// routes/statistics.js - БЕЗ АВТОРИЗАЦИИ ДЛЯ ТЕСТА
const express = require('express');
const router = express.Router();
const PDFGenerator = require('../utils/pdf-generator');

// 📄 PDF отчет по студенту - БЕЗ АВТОРИЗАЦИИ
router.get('/student/:studentId/pdf', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        console.log('📄 Генерация PDF для студента:', studentId);

        // Тестовые данные
        const testStudent = {
            name: "Иванов Иван Иванович",
            group: "Т-101"
        };

        const testGrades = [
            { subject: "Математика", grade: 5, date: new Date() },
            { subject: "Физика", grade: 4, date: new Date() },
            { subject: "Информатика", grade: 5, date: new Date() }
        ];

        const testStatistics = {
            averageGrade: 4.7,
            performance: 100,
            totalGrades: 3,
            bySubject: {
                "Математика": { average: 5, count: 1 },
                "Физика": { average: 4, count: 1 },
                "Информатика": { average: 5, count: 1 }
            }
        };

        // Генерируем PDF
        const pdfGenerator = new PDFGenerator();
        const pdfBuffer = await pdfGenerator.generateStudentReport(
            testStudent,
            testGrades,
            testStatistics
        );

        // Отправляем PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report-${testStudent.name}.pdf"`);
        res.send(pdfBuffer);

        console.log('✅ PDF успешно сгенерирован');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета: ' + error.message
        });
    }
});

// 📄 PDF отчет по группе - БЕЗ АВТОРИЗАЦИИ
router.get('/group/:groupId/pdf', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        console.log('📄 Генерация PDF для группы:', groupId);

        // Тестовые данные
        const testGroup = {
            name: "Т-101",
            curator: "Петрова Мария Ивановна"
        };

        const testStudents = [
            { name: "Иванов Иван", averageGrade: "4.50", performance: 90 },
            { name: "Петрова Анна", averageGrade: "4.20", performance: 85 },
            { name: "Сидоров Петр", averageGrade: "3.80", performance: 75 }
        ];

        const testStatistics = {
            groupAverage: 4.17,
            totalGrades: 45,
            totalStudents: 3,
            goodGrades: 35,
            successRate: 88.9
        };

        // Генерируем PDF
        const pdfGenerator = new PDFGenerator();
        const pdfBuffer = await pdfGenerator.generateGroupReport(
            testGroup,
            testStudents,
            testStatistics
        );

        // Отправляем PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="group-report-${testGroup.name}.pdf"`);
        res.send(pdfBuffer);

        console.log('✅ PDF группы успешно сгенерирован');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF группы:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета группы: ' + error.message
        });
    }
});

// 📊 Общая статистика системы - БЕЗ АВТОРИЗАЦИИ
router.get('/overview', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                students: 150,
                teachers: 15,
                subjects: 20,
                grades: 1250,
                groups: 8,
                averageGrade: 4.2
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

module.exports = router;