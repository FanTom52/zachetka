// test-server.js - ПРОСТОЙ ТЕСТОВЫЙ СЕРВЕР БЕЗ АВТОРИЗАЦИИ
const express = require('express');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = 3001; // Используем другой порт

app.use(express.json());
app.use(express.static('public'));

// 📊 Простая статистика
app.get('/api/statistics/overview', (req, res) => {
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
});

// 🎓 Студенты
app.get('/api/students', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: "Иванов Иван", group_name: "Т-101", average_grade: 4.5 },
            { id: 2, name: "Петрова Анна", group_name: "Т-101", average_grade: 4.2 },
            { id: 3, name: "Сидоров Петр", group_name: "Т-102", average_grade: 3.8 }
        ]
    });
});

// 👥 Группы
app.get('/api/groups', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: "Т-101", curator: "Иванова М.П.", student_count: 25 },
            { id: 2, name: "Т-102", curator: "Петров С.И.", student_count: 23 },
            { id: 3, name: "Т-103", curator: "Сидорова О.Л.", student_count: 22 }
        ]
    });
});

// 📄 PDF отчет по студенту - ПРОСТАЯ ВЕРСИЯ
app.get('/api/statistics/student/:id/pdf', (req, res) => {
    try {
        const studentId = req.params.id;
        console.log('📄 Генерация PDF для студента:', studentId);

        const doc = new PDFDocument();
        
        // Устанавливаем заголовки
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="student-${studentId}.pdf"`);
        
        // Генерируем простой PDF
        doc.pipe(res);
        doc.fontSize(20).text('Отчет по студенту', 100, 100);
        doc.fontSize(12).text(`ID студента: ${studentId}`, 100, 150);
        doc.text(`Имя: Тестовый Студент ${studentId}`, 100, 170);
        doc.text(`Группа: Т-10${studentId}`, 100, 190);
        doc.text(`Средний балл: 4.${studentId}`, 100, 210);
        doc.text('Дата генерации: ' + new Date().toLocaleDateString(), 100, 230);
        doc.end();

        console.log('✅ PDF успешно отправлен');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета'
        });
    }
});

// 📄 PDF отчет по группе - ПРОСТАЯ ВЕРСИЯ
app.get('/api/statistics/group/:id/pdf', (req, res) => {
    try {
        const groupId = req.params.id;
        console.log('📄 Генерация PDF для группы:', groupId);

        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="group-${groupId}.pdf"`);
        
        doc.pipe(res);
        doc.fontSize(20).text('Отчет по группе', 100, 100);
        doc.fontSize(12).text(`ID группы: ${groupId}`, 100, 150);
        doc.text(`Название: Т-10${groupId}`, 100, 170);
        doc.text(`Куратор: Тестовый Преподаватель`, 100, 190);
        doc.text(`Количество студентов: 2${groupId}`, 100, 210);
        doc.text(`Средний балл: 4.${groupId}`, 100, 230);
        doc.text('Дата генерации: ' + new Date().toLocaleDateString(), 100, 250);
        doc.end();

        console.log('✅ PDF группы успешно отправлен');

    } catch (error) {
        console.error('❌ Ошибка генерации PDF группы:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка генерации отчета группы'
        });
    }
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Тестовый сервер работает!',
        timestamp: new Date().toISOString()
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 ТЕСТОВЫЙ СЕРВЕР запущен на порту ${PORT}`);
    console.log(`📊 Статистика: http://localhost:${PORT}/api/statistics/overview`);
    console.log(`🎓 Студенты: http://localhost:${PORT}/api/students`);
    console.log(`👥 Группы: http://localhost:${PORT}/api/groups`);
    console.log(`📄 Тест PDF: http://localhost:${PORT}/api/statistics/student/1/pdf`);
});