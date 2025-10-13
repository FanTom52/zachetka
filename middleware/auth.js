// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-change-in-production';

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Требуется авторизация' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Неверный или просроченный токен' 
            });
        }
        
        req.user = user;
        next();
    });
};

// Middleware для проверки ролей
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                error: `Недостаточно прав. Требуемые роли: ${roles.join(', ')}`
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};