const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

/**
 * Middleware ตรวจสอบ JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'Access token is required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err);
            return res.status(403).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        req.user = user;
        next();
    });
}

/**
 * Middleware ตรวจสอบสิทธิ์ admin
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: 'Authentication required' 
        });
    }

    // ตรวจสอบว่าเป็น admin (role_id = 1 หรือ role = 'admin')
    if (req.user.role_id !== 1 && req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            message: 'Admin access required' 
        });
    }

    next();
}

/**
 * Middleware ตรวจสอบว่าเป็นเจ้าของ resource หรือ admin
 */
function requireOwnerOrAdmin(userIdField = 'user_id') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        const resourceUserId = req.params[userIdField] || req.body[userIdField];
        const currentUserId = req.user.user_id;
        const isAdmin = req.user.role_id === 1 || req.user.role === 'admin';

        if (!isAdmin && currentUserId != resourceUserId) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. You can only access your own resources.' 
            });
        }

        next();
    };
}

/**
 * Optional authentication - ไม่บังคับต้องมี token
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
}

module.exports = {
    authenticateToken,
    requireAdmin,
    requireOwnerOrAdmin,
    optionalAuth
};