const PDFDocument = require('pdfkit');

class PDFGenerator {
    constructor() {
        this.doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });
    }

    async generateStudentReport(studentData, grades, statistics) {
        const { doc } = this;
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        
        // Заголовок
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(`Отчет по студенту: ${studentData.name}`, 50, 50)
           .moveDown(0.5);

        // Основная информация
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Группа: ${studentData.group}`)
           .text(`Средний балл: ${statistics.averageGrade}`)
           .text(`Успеваемость: ${statistics.performance}%`)
           .text(`Всего оценок: ${statistics.totalGrades}`)
           .moveDown();

        doc.text('Это тестовый PDF отчет. Функция работает!')
           .moveDown();

        doc.end();
        
        return new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });
    }

    async generateGroupReport(groupData, students, statistics) {
        const { doc } = this;
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(`Отчет по группе: ${groupData.name}`, 50, 50)
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Куратор: ${groupData.curator}`)
           .text(`Количество студентов: ${students.length}`)
           .text(`Средний балл группы: ${statistics.groupAverage}`)
           .moveDown();

        doc.text('Это тестовый PDF отчет группы. Функция работает!')
           .moveDown();

        doc.end();
        
        return new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });
    }
}

module.exports = PDFGenerator;