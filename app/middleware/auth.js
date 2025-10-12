// Authentication and authorization middleware

const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    // Check if user exists in session
    if (req.session && req.session.user) {
        return next();
    }
    
    // For API requests, return JSON error
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    // For web requests, redirect to login page
    const redirectUrl = req.originalUrl;
    return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    // First check if user is logged in
    if (!req.session || !req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        return res.redirect('/login');
    }
    
    // Check if user has admin role
    const user = req.session.user;
    if (user.role_id !== 1 && user.role !== 'admin') {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'Admin access required',
            error: { status: 403 }
        });
    }
    
    next();
};

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'user_id') => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }
            return res.redirect('/login');
        }
        
        const currentUser = req.session.user;
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        
        // Allow if user is admin or owns the resource
        if (currentUser.role_id === 1 || currentUser.role === 'admin' || 
            currentUser.user_id == resourceUserId) {
            return next();
        }
        
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You can only access your own resources',
            error: { status: 403 }
        });
    };
};

// Middleware to check user role
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }
            return res.redirect('/login');
        }
        
        const user = req.session.user;
        const userRole = user.role || (user.role_id === 1 ? 'admin' : 'user');
        
        if (userRole !== requiredRole) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ 
                    success: false, 
                    message: `${requiredRole} access required` 
                });
            }
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: `${requiredRole} access required`,
                error: { status: 403 }
            });
        }
        
        next();
    };
};

// Middleware to add user info to response locals (for templates)
const addUserToLocals = (req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    res.locals.isLoggedIn = !!(req.session && req.session.user);
    res.locals.isAdmin = !!(req.session && req.session.user && 
        (req.session.user.role_id === 1 || req.session.user.role === 'admin'));
    next();
};

// Middleware to check if user is NOT logged in (for login/register pages)
const requireGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        // User is already logged in, redirect to dashboard
        const redirectUrl = req.query.redirect || '/';
        return res.redirect(redirectUrl);
    }
    next();
};

// JWT token verification middleware (if using JWT in addition to sessions)
const verifyJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    
    if (!token) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }
        return next(); // Let other middleware handle it
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.jwtUser = decoded;
        next();
    } catch (error) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        next();
    }
};

// Rate limiting middleware for authentication endpoints
const authRateLimit = (req, res, next) => {
    // This would typically use a more sophisticated rate limiting solution
    // For now, we'll implement a simple in-memory rate limiter
    
    const ip = req.ip || req.connection.remoteAddress;
    const key = `auth_attempts_${ip}`;
    
    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }
    
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    const attempts = global.rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > attempts.resetTime) {
        // Reset the counter
        attempts.count = 0;
        attempts.resetTime = now + windowMs;
    }
    
    if (attempts.count >= maxAttempts) {
        if (req.path.startsWith('/api/')) {
            return res.status(429).json({ 
                success: false, 
                message: 'Too many authentication attempts. Please try again later.' 
            });
        }
        return res.status(429).render('error', {
            title: 'Too Many Attempts',
            message: 'Too many authentication attempts. Please try again later.',
            error: { status: 429 }
        });
    }
    
    // Increment attempt counter on failed auth (this should be called from auth routes)
    req.incrementAuthAttempts = () => {
        attempts.count++;
        global.rateLimitStore.set(key, attempts);
    };
    
    next();
};

// Middleware to log user activity
const logUserActivity = (action) => {
    return async (req, res, next) => {
        if (req.session && req.session.user) {
            try {
                await db.query(
                    'INSERT INTO user_activity_logs (user_id, action, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [req.session.user.user_id, action, req.ip, req.get('User-Agent')]
                );
            } catch (error) {
                console.error('Failed to log user activity:', error);
                // Don't block the request if logging fails
            }
        }
        next();
    };
};

// Middleware to check if email is verified (if implementing email verification)
const requireEmailVerified = (req, res, next) => {
    if (!req.session || !req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        return res.redirect('/login');
    }
    
    const user = req.session.user;
    if (!user.email_verified) {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Email verification required' 
            });
        }
        return res.redirect('/verify-email');
    }
    
    next();
};

// Dummy authentication for development
const authenticateToken = (req, res, next) => {
    req.user = {
        user_id: 1,
        role: 'user'
    };
    next();
};

module.exports = {
    requireLogin,
    requireAdmin,
    requireOwnershipOrAdmin,
    requireRole,
    requireGuest,
    addUserToLocals,
    verifyJWT,
    authRateLimit,
    logUserActivity,
    requireEmailVerified,
    authenticateToken
};