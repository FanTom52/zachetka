// fix-attendance-table-complete.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gradebook.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Полное исправление таблицы attendance...');

// Создаем временную таблицу с правильной структурой
const createTempTable = `
CREATE TABLE IF NOT EXISTS attendance_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
`;

// Функция для нормализации статуса
function normalizeStatus(status) {
    const statusMap = {
        'present': 'present',
        'absent': 'absent', 
        'late': 'late',
        'excused': 'excused',
        'Присутствовал': 'present',
        'Отсутствовал': 'absent',
        'Опоздал': 'late',
        'Уважительная': 'excused'
    };
    return statusMap[status] || 'absent'; // По умолчанию 'absent' для некорректных статусов
}

// Сначала прочитаем все данные из старой таблицы
db.all("SELECT * FROM attendance", (err, oldRecords) => {
    if (err) {
        console.error('❌ Ошибка чтения старых данных:', err);
        db.close();
        return;
    }
    
    console.log(`📊 Найдено записей: ${oldRecords.length}`);
    
    // Создаем временную таблицу
    db.run(createTempTable, (err) => {
        if (err) {
            console.error('❌ Ошибка создания временной таблицы:', err);
            db.close();
            return;
        }
        console.log('✅ Временная таблица создана');
        
        // Вставляем данные по одной с нормализацией статусов
        let insertedCount = 0;
        let errorCount = 0;
        
        oldRecords.forEach(record => {
            const normalizedStatus = normalizeStatus(record.status);
            
            const insertSql = `
                INSERT INTO attendance_temp (id, student_id, subject_id, teacher_id, date, status, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(insertSql, [
                record.id,
                record.student_id,
                record.subject_id,
                1, // teacher_id по умолчанию
                record.date,
                normalizedStatus,
                record.notes,
                record.created_at
            ], function(err) {
                if (err) {
                    console.error(`❌ Ошибка вставки записи ${record.id}:`, err);
                    errorCount++;
                } else {
                    insertedCount++;
                }
                
                // Когда все записи обработаны
                if (insertedCount + errorCount === oldRecords.length) {
                    console.log(`✅ Вставлено записей: ${insertedCount}, ошибок: ${errorCount}`);
                    
                    // Завершаем миграцию
                    db.run("DROP TABLE IF EXISTS attendance_old", (err) => {
                        if (err) {
                            console.error('❌ Ошибка удаления backup таблицы:', err);
                        }
                        
                        db.run("ALTER TABLE attendance RENAME TO attendance_old", (err) => {
                            if (err) {
                                console.error('❌ Ошибка переименования старой таблицы:', err);
                                db.close();
                                return;
                            }
                            
                            db.run("ALTER TABLE attendance_temp RENAME TO attendance", (err) => {
                                if (err) {
                                    console.error('❌ Ошибка переименования новой таблицы:', err);
                                } else {
                                    console.log('✅ Таблица attendance успешно исправлена!');
                                }
                                
                                db.close();
                                console.log('🎉 Миграция завершена!');
                                console.log('💾 Старая таблица сохранена как attendance_old');
                            });
                        });
                    });
                }
            });
        });
        
        // Если нет записей в старой таблице
        if (oldRecords.length === 0) {
            db.run("DROP TABLE IF EXISTS attendance_old", (err) => {
                db.run("ALTER TABLE attendance RENAME TO attendance_old", (err) => {
                    db.run("ALTER TABLE attendance_temp RENAME TO attendance", (err) => {
                        if (err) {
                            console.error('❌ Ошибка переименования:', err);
                        } else {
                            console.log('✅ Таблица attendance успешно исправлена!');
                        }
                        db.close();
                    });
                });
            });
        }
    });
});