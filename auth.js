const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный или просроченный токен' });
        }
        req.user = user;
        next();
    });
}

// Middleware для проверки ролей
function requireRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Недостаточно прав для выполнения этой операции' 
            });
        }
        next();
    };
}

// Генерация JWT токена
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            student_id: user.student_id,
            teacher_id: user.teacher_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Хеширование пароля
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Проверка пароля
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

module.exports = {
    authenticateToken,
    requireRole,
    generateToken,
    hashPassword,
    comparePassword,
    JWT_SECRET
};