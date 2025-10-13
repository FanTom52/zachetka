// utils/backup.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const config = require('../config');

class BackupManager {
    constructor() {
        this.backupPath = config.database.backupPath;
        this.ensureBackupDirectory();
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }

    async createBackup() {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupPath, `backup-${timestamp}.db`);
            
            // Копируем файл базы данных
            fs.copyFile(config.database.path, backupFile, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Резервная копия создана: ${backupFile}`);
                    resolve(backupFile);
                }
            });
        });
    }

    async restoreBackup(backupFile) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(backupFile)) {
                reject(new Error('Файл резервной копии не найден'));
                return;
            }

            // Создаем резервную копию текущей базы перед восстановлением
            const currentBackup = path.join(this.backupPath, `pre-restore-${Date.now()}.db`);
            fs.copyFile(config.database.path, currentBackup, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Восстанавливаем из резервной копии
                fs.copyFile(backupFile, config.database.path, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ База данных восстановлена из: ${backupFile}`);
                        resolve();
                    }
                });
            });
        });
    }

    listBackups() {
        try {
            const files = fs.readdirSync(this.backupPath)
                .filter(file => file.endsWith('.db'))
                .map(file => {
                    const filePath = path.join(this.backupPath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime
                    };
                })
                .sort((a, b) => b.created - a.created);

            return files;
        } catch (error) {
            console.error('Ошибка получения списка резервных копий:', error);
            return [];
        }
    }

    async cleanupOldBackups(maxBackups = 10) {
        const backups = this.listBackups();
        
        if (backups.length > maxBackups) {
            const toDelete = backups.slice(maxBackups);
            
            for (const backup of toDelete) {
                try {
                    fs.unlinkSync(backup.path);
                    console.log(`🗑️ Удалена старая резервная копия: ${backup.name}`);
                } catch (error) {
                    console.error(`Ошибка удаления резервной копии ${backup.name}:`, error);
                }
            }
        }
    }
}

module.exports = new BackupManager();