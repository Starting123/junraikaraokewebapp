const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Enforce JWT_SECRET environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
}

/**
 * Session-based authentication middleware
 */
function requireLogin(req, res, next) {
    // Check session first
    if (req.session && req.session.user) {
        req.user = req.session.user;
        return next();
    }
    
    // Fallback to JWT token for API requests
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
            return next();
        } catch (err) {
            // Token invalid, continue to rejection
        }
    }
    
    // Handle different response types
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Login required' });
    }
    
    // For web routes, redirect to login with return URL
    return res.redirect('/auth?redirect=' + encodeURIComponent(req.originalUrl));
}

/**
 * Admin role requirement middleware - ALWAYS enforced
 */
function requireAdmin(req, res, next) {
    // Check session first
    if (!req.session || !req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Login required' });
        }
        return res.redirect('/auth?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    if (req.session.user.role_id !== 1) {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        return res.status(403).render('error', { 
            message: 'ต้องการสิทธิ์ผู้ดูแลระบบ',
            error: { status: 403 }
        });
    }
    
    req.user = req.session.user;
    next();
}

/**
 * Async error handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Enhanced rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, try again later',
        retryAfter: 15 * 60,
        type: 'rate_limit_exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Legacy compatibility
 */
const authenticateToken = requireLogin;
function requireOwnerOrAdmin(userIdField = 'user_id') {
    return requireLogin;
}
function optionalAuth(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
}

module.exports = {
    requireLogin,
    requireAdmin,
    asyncHandler,
    authLimiter,
    authenticateToken, // legacy
    requireOwnerOrAdmin, // legacy
    optionalAuth // legacy
};