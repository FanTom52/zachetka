// add-student-grades.js
const db = require('./database');

console.log('📝 Добавляем оценки для студентов...');

// Добавляем оценки для студента Петровой Марии (ID: 2)
const grades = [
    [2, 1, 5, 'exam', '2024-01-15', 1],      // Программирование - экзамен
    [2, 1, 4, 'coursework', '2024-01-10', 1], // Программирование - курсовая
    [2, 2, 5, 'test', '2024-01-20', 2],       // Базы данных - зачёт
    [2, 3, 4, 'exam', '2024-01-25', 3],       // Математика - экзамен
    [2, 4, 5, 'practice', '2024-02-01', 1],   // Веб-технологии - практика
    
    // Добавляем оценки и для других студентов
    [1, 1, 3, 'exam', '2024-01-15', 1],       // Иванов - Программирование
    [3, 2, 4, 'test', '2024-01-20', 2],       // Сидоров - Базы данных
    [4, 3, 5, 'exam', '2024-01-25', 3]        // Козлова - Математика
];

let completed = 0;

grades.forEach(grade => {
    db.run(
        `INSERT OR IGNORE INTO grades (student_id, subject_id, grade, grade_type, date, teacher_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        grade,
        function(err) {
            if (err) {
                console.error('❌ Ошибка добавления оценки:', err);
            } else {
                console.log(`✅ Оценка добавлена: студент ${grade[0]}, предмет ${grade[1]}, оценка ${grade[2]}`);
            }
            completed++;
            
            if (completed === grades.length) {
                console.log('🎉 Все оценки успешно добавлены!');
                console.log('\n📊 Проверьте раздел "Оценки" для студента Петровой Марии');
                process.exit(0);
            }
        }
    );
});