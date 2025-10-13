// fix-student-user.js
const db = require('./database');

console.log('🔧 Исправляем пользователя student...');

// Находим ID студента Петровой Марии
db.get('SELECT id FROM students WHERE name LIKE "%Петрова%"', (err, student) => {
    if (err) {
        console.error('❌ Ошибка:', err);
        return;
    }
    
    if (!student) {
        console.error('❌ Студент Петрова не найден');
        return;
    }
    
    console.log('👤 Найден студент Петрова с ID:', student.id);
    
    // Обновляем пользователя student, привязываем к студенту
    db.run(
        'UPDATE users SET student_id = ? WHERE username = "student"',
        [student.id],
        function(err) {
            if (err) {
                console.error('❌ Ошибка обновления:', err);
                return;
            }
            
            console.log('✅ Пользователь student обновлен!');
            console.log('📝 Привязан к студенту с ID:', student.id);
            
            // Проверяем результат
            db.get('SELECT * FROM users WHERE username = "student"', (err, user) => {
                if (err) {
                    console.error('❌ Ошибка проверки:', err);
                    return;
                }
                
                console.log('👤 Обновленные данные пользователя:');
                console.log(user);
                process.exit(0);
            });
        }
    );
});