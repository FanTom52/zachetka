// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../utils/database');

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Токен доступа отсутствует'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Недействительный токен'
            });
        }
        
        req.user = user;
        next();
    });
}

// Middleware для проверки прав доступа
function requirePermission(permission) {
    return (req, res, next) => {
        const userRole = req.user.role;
        
        // Маппинг ролей и разрешений
        const rolePermissions = {
            admin: ['view_statistics', 'view_students', 'view_groups', 'manage_users', 'manage_grades'],
            teacher: ['view_statistics', 'view_students', 'view_groups', 'manage_grades'],
            student: ['view_statistics'] // студенты могут видеть только свою статистику
        };

        const allowedPermissions = rolePermissions[userRole] || [];
        
        if (allowedPermissions.includes(permission)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                error: 'Недостаточно прав для выполнения этого действия'
            });
        }
    };
}

// Middleware для проверки, что пользователь администратор
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Требуются права администратора'
        });
    }
    next();
}

// Middleware для проверки, что пользователь преподаватель или администратор
function requireTeacherOrAdmin(req, res, next) {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Требуются права преподавателя или администратора'
        });
    }
    next();
}

module.exports = {
    authenticateToken,
    requirePermission,
    requireAdmin,
    requireTeacherOrAdmin
};