// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../utils/database');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

// 🔐 Вход в систему
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Логин и пароль обязательны'
            });
        }

        // Ищем пользователя
        const sql = `
            SELECT u.*, s.name as student_name, t.name as teacher_name 
            FROM users u 
            LEFT JOIN students s ON u.student_id = s.id 
            LEFT JOIN teachers t ON u.teacher_id = t.id 
            WHERE u.username = ? AND u.is_active = 1
        `;
        
        db.get(sql, [username], async (err, user) => {
            if (err) {
                console.error('Ошибка поиска пользователя:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка сервера при авторизации'
                });
            }
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Пользователь не найден'
                });
            }

            // Проверяем пароль
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Неверный пароль'
                });
            }

            // Обновляем время последнего входа
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            // Генерируем JWT токен
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role,
                    student_id: user.student_id,
                    teacher_id: user.teacher_id
                },
                config.security.jwtSecret,
                { expiresIn: config.security.jwtExpiresIn }
            );

            // Формируем ответ
            const userResponse = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.student_name || user.teacher_name || 'Администратор',
                email: user.email
            };

            res.json({
                success: true,
                message: 'Авторизация успешна',
                token,
                user: userResponse
            });
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 👤 Получить текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT u.*, s.name as student_name, t.name as teacher_name 
            FROM users u 
            LEFT JOIN students s ON u.student_id = s.id 
            LEFT JOIN teachers t ON u.teacher_id = t.id 
            WHERE u.id = ?
        `;
        
        db.get(sql, [req.user.id], (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных пользователя'
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Пользователь не найден'
                });
            }

            const userResponse = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.student_name || user.teacher_name || 'Администратор',
                email: user.email,
                student_id: user.student_id,
                teacher_id: user.teacher_id
            };

            res.json({
                success: true,
                data: userResponse
            });
        });

    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// 🔄 Обновить профиль
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Получаем текущего пользователя
        db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка получения данных пользователя'
                });
            }

            // Проверяем текущий пароль если меняется пароль
            if (newPassword) {
                if (!currentPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Текущий пароль обязателен для смены пароля'
                    });
                }

                const validPassword = await bcrypt.compare(currentPassword, user.password);
                if (!validPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Неверный текущий пароль'
                    });
                }

                // Хешируем новый пароль
                const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);
                
                // Обновляем пароль и email
                db.run(
                    'UPDATE users SET password = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [hashedPassword, email, userId],
                    function(err) {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                error: 'Ошибка обновления профиля'
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Профиль успешно обновлен'
                        });
                    }
                );
            } else {
                // Обновляем только email
                db.run(
                    'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [email, userId],
                    function(err) {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                error: 'Ошибка обновления профиля'
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Профиль успешно обновлен'
                        });
                    }
                );
            }
        });

    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

module.exports = router;