// check-student.js
const db = require('./database');

console.log('🔍 Проверяем данные студента...');

// Проверяем всех студентов
db.all('SELECT * FROM students', (err, students) => {
    if (err) {
        console.error('❌ Ошибка:', err);
        return;
    }
    
    console.log('📋 Список студентов:');
    students.forEach(student => {
        console.log(`ID: ${student.id}, Имя: ${student.name}, Группа: ${student.group_id}`);
    });
    
    // Проверяем пользователя student
    db.get('SELECT * FROM users WHERE username = "student"', (err, user) => {
        if (err) {
            console.error('❌ Ошибка:', err);
            return;
        }
        
        console.log('\n👤 Данные пользователя student:');
        console.log(user);
        
        // Проверяем оценки для студента с ID 2 (Петрова)
        db.all('SELECT * FROM grades WHERE student_id = 2', (err, grades) => {
            if (err) {
                console.error('❌ Ошибка:', err);
                return;
            }
            
            console.log('\n📊 Оценки для студента ID 2:');
            console.log(grades);
            
            process.exit(0);
        });
    });
});