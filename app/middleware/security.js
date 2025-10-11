/**
 * ==========================================
 * Security Middleware
 * Rate limiting, CORS, helmet, and other security measures
 * ==========================================
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * Rate limiting configurations
 */
const rateLimiters = {
    // General API rate limiting
    general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: 900 // 15 minutes in seconds
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: 900,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Authentication endpoints (stricter)
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: {
            error: 'Too many authentication attempts. Please try again later.',
            retryAfter: 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful requests
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many authentication attempts. Please try again later.',
                retryAfter: 900,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Registration endpoint (even stricter)
    register: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per hour
        message: {
            error: 'Too many registration attempts. Please try again later.',
            retryAfter: 3600
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many registration attempts. Please try again later.',
                retryAfter: 3600,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Password reset (moderate)
    passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // 5 password reset requests per hour
        message: {
            error: 'Too many password reset attempts. Please try again later.',
            retryAfter: 3600
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many password reset attempts. Please try again later.',
                retryAfter: 3600,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Admin endpoints (stricter monitoring)
    admin: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // 50 admin actions per window
        message: {
            error: 'Too many admin requests. Please try again later.',
            retryAfter: 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many admin requests. Please try again later.',
                retryAfter: 900,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // File upload (very strict)
    fileUpload: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 file uploads per hour
        message: {
            error: 'Too many file uploads. Please try again later.',
            retryAfter: 3600
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'Too many file uploads. Please try again later.',
                retryAfter: 3600,
                timestamp: new Date().toISOString()
            });
        }
    })
};

/**
 * CORS configuration
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'https://yourproductiondomain.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

/**
 * Helmet configuration
 */
const helmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Allow embedding for development
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Remove server identification
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add cache control for sensitive endpoints
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

/**
 * Request sanitization
 */
const sanitizeRequest = (req, res, next) => {
    // Basic XSS protection - strip potential script tags
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = sanitizeString(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };
        sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = sanitizeString(req.query[key]);
        }
    }
    
    next();
};

/**
 * IP-based security check
 */
const ipSecurity = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Log suspicious activity
    if (req.path.includes('..') || req.path.includes('etc/passwd') || req.path.includes('cmd')) {
        console.warn(`Suspicious request from IP ${clientIp}:`, {
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

/**
 * Request logging for security monitoring
 */
const securityLogger = (req, res, next) => {
    // Log admin actions
    if (req.path.startsWith('/api/admin') && req.method !== 'GET') {
        console.log(`Admin action:`, {
            user: req.user ? req.user.user_id : 'anonymous',
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }
    
    // Log authentication attempts
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
        console.log(`Auth attempt:`, {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

module.exports = {
    rateLimiters,
    corsOptions,
    helmetOptions,
    securityHeaders,
    sanitizeRequest,
    ipSecurity,
    securityLogger,
    
    // Convenience function to apply all security middleware
    applySecurity: (app) => {
        app.use(helmet(helmetOptions));
        app.use(cors(corsOptions));
        app.use(securityHeaders);
        app.use(sanitizeRequest);
        app.use(ipSecurity);
        app.use(securityLogger);
    }
};