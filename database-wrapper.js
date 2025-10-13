// database-wrapper.js - правильная обертка для SQLite
const sqlite3 = require('sqlite3').verbose();

class DatabaseWrapper {
    constructor() {
        this.db = new sqlite3.Database('./gradebook.db', (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к БД:', err.message);
            } else {
                console.log('✅ Подключение к SQLite базе данных установлено');
            }
        });
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка SQL запроса:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Ошибка SQL выполнения:', err);
                    reject(err);
                } else {
                    resolve({ 
                        insertId: this.lastID, 
                        changes: this.changes 
                    });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Ошибка SQL получения:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
}

module.exports = new DatabaseWrapper();