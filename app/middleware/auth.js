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
    console.log('🔒 requireLogin middleware called for:', req.path);
    
    // Prevent redirect loops
    if (req.path === '/auth' || req.path === '/') {
        return next();
    }
    
    // Check session first
    if (req.session && req.session.user) {
        console.log('✅ Session user found:', req.session.user.email);
        req.user = req.session.user;
        return next();
    }
    
    // Fallback to JWT token for API requests
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            console.log('✅ JWT token valid for user:', payload.email);
            req.user = payload;
            
            // For API requests with valid JWT, also populate session
            if (req.path.startsWith('/api/') && !req.session.user) {
                req.session.user = payload;
            }
            return next();
        } catch (err) {
            console.log('❌ JWT token invalid:', err.message);
        }
    }
    
    console.log('❌ No valid authentication found');
    
    // Handle different response types
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Login required' });
    }
    
    // For web routes, redirect to login with return URL (prevent loops)
    if (!req.path.includes('/auth')) {
        return res.redirect('/auth?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    return next();
}

/**
 * Admin role requirement middleware - ALWAYS enforced
 */
function requireAdmin(req, res, next) {
    console.log('🔐 requireAdmin middleware called for:', req.path);
    console.log('🔐 Session exists:', !!req.session);
    console.log('🔐 Session ID:', req.session?.id);
    console.log('🔐 Session user:', req.session?.user ? 'exists' : 'not found');
    console.log('🔐 Full session:', JSON.stringify(req.session, null, 2));
    
    // Prevent redirect loops by checking if already on auth page
    if (req.path === '/auth') {
        console.log('⚠️ Already on auth page, skipping admin check');
        return next();
    }

    // Check if this request is part of a redirect loop
    const redirectCount = req.session.redirectCount || 0;
    if (redirectCount > 3) {
        console.log('🛑 Redirect loop detected, breaking cycle');
        req.session.redirectCount = 0; // Reset counter
        return res.status(403).render('error', { 
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาล็อกอินใหม่',
            error: { status: 403 }
        });
    }
    
    // Check session first
    if (!req.session || !req.session.user) {
        console.log('❌ No session/user found');
        
        // Clear broken session data if session exists but no user
        if (req.session && !req.session.user) {
            console.log('🧹 Clearing broken session data');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
            });
        }
        
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Login required' });
        }
        
        // Redirect to auth without redirect parameter to force fresh login
        return res.redirect('/auth');
    }
    
    console.log('✅ User found, role_id:', req.session.user.role_id);
    
    // Reset redirect count on successful auth
    req.session.redirectCount = 0;
    
    if (req.session.user.role_id !== 1) {
        console.log('❌ User is not admin, access denied');
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        return res.status(403).render('error', { 
            message: 'ต้องการสิทธิ์ผู้ดูแลระบบ',
            error: { status: 403 }
        });
    }
    
    console.log('✅ Admin access granted');
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