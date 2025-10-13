// Создайте файл add-grades.js и запустите: node add-grades.js
const db = require('./database');

const grades = [
    [1, 1, 5, 'exam', '2024-01-20', 1],
    [1, 2, 4, 'test', '2024-01-21', 2],
    [2, 1, 3, 'exam', '2024-01-20', 1],
    [3, 3, 5, 'test', '2024-01-22', 3]
];

grades.forEach(grade => {
    db.run(`INSERT INTO grades VALUES (NULL, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, grade);
});

console.log('✅ Оценки добавлены!');