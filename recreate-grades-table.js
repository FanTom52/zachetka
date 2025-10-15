// recreate-grades-table.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gradebook.db');

console.log('🔄 Пересоздаем таблицу grades...');

// Сохраняем существующие данные (если есть)
db.all("SELECT * FROM grades", (err, existingGrades) => {
    if (err) {
        console.log('ℹ️ Таблица grades не существует или пустая');
    } else {
        console.log(`📊 Сохраняем ${existingGrades.length} существующих записей...`);
    }

    // Удаляем старую таблицу
    db.run("DROP TABLE IF EXISTS grades", (err) => {
        if (err) {
            console.error('❌ Ошибка удаления таблицы:', err);
            return;
        }
        
        console.log('✅ Старая таблица удалена');

        // Создаем новую таблицу
        const createTableSQL = `
            CREATE TABLE grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                subject_id INTEGER,
                grade INTEGER CHECK(grade BETWEEN 2 AND 5 OR grade IS NULL),
                is_pass INTEGER CHECK(is_pass IN (0, 1)),
                grade_type TEXT NOT NULL CHECK(grade_type IN ('exam', 'test', 'credit', 'coursework', 'practice')),
                date TEXT NOT NULL,
                teacher_id INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (teacher_id) REFERENCES teachers(id),
                UNIQUE(student_id, subject_id, grade_type)
            )
        `;

        db.run(createTableSQL, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы:', err);
                return;
            }
            
            console.log('✅ Новая таблица создана');

            // Восстанавливаем данные если они были
            if (existingGrades && existingGrades.length > 0) {
                console.log('🔄 Восстанавливаем данные...');
                
                const insertSQL = `
                    INSERT INTO grades (id, student_id, subject_id, grade, grade_type, date, teacher_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                let completed = 0;
                existingGrades.forEach(grade => {
                    db.run(insertSQL, [
                        grade.id, grade.student_id, grade.subject_id, 
                        grade.grade, grade.grade_type, grade.date, 
                        grade.teacher_id, grade.created_at
                    ], function(err) {
                        if (err) {
                            console.error('❌ Ошибка вставки записи:', err);
                        }
                        completed++;
                        
                        if (completed === existingGrades.length) {
                            console.log(`✅ Данные восстановлены (${completed} записей)`);
                            db.close();
                        }
                    });
                });
            } else {
                console.log('✅ Таблица готова к использованию');
                db.close();
            }
        });
    });
});