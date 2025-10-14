const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware ตรวจสอบ JWT token
 * รองรับทั้ง API requests (JSON response) และ Page requests (redirect)
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // ตรวจสอบว่าเป็น API request หรือ Page request
    const isApiRequest = req.path.startsWith('/api') || 
                         req.headers['accept']?.includes('application/json') ||
                         req.xhr; // XMLHttpRequest

    if (!token) {
        // ถ้าเป็น Page request ให้ redirect ไป login
        if (!isApiRequest && req.method === 'GET') {
            return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
        }
        
        // ถ้าเป็น API request ให้ return JSON
        return res.status(401).json({ 
            success: false,
            message: 'Access token is required' 
        });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err);
            
            // ถ้าเป็น Page request ให้ redirect ไป login
            if (!isApiRequest && req.method === 'GET') {
                return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
            }
            
            // ถ้าเป็น API request ให้ return JSON
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

    jwt.verify(token, config.jwt.secret, (err, user) => {
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