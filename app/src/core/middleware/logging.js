const morgan = require('morgan');

/**
 * Logging middleware configuration
 */

// Custom token for response time
morgan.token('response-time-ms', (req, res) => {
    return `${res.getHeader('X-Response-Time') || 0}ms`;
});

// Custom format for development
const devFormat = ':method :url :status :response-time-ms - :res[content-length]';

// Custom format for production
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Request logging middleware
const requestLogger = (env = 'development') => {
    const format = env === 'production' ? prodFormat : devFormat;
    return morgan(format);
};

// Custom middleware to add response time header
const responseTime = (req, res, next) => {
    const start = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to set header before response ends
    res.end = function(...args) {
        const duration = Date.now() - start;
        // Only set header if not already sent
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${duration}ms`);
        }
        // Call original end function
        originalEnd.apply(res, args);
    };
    
    next();
};

// Request ID middleware
const requestId = (req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
};

module.exports = {
    requestLogger,
    responseTime,
    requestId
};