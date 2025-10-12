// API Response middleware for consistent JSON responses

/**
 * Middleware to add standardized response methods to res object
 */
const apiResponse = (req, res, next) => {
    // Success response
    res.success = (data = null, message = 'Success', statusCode = 200) => {
        const response = {
            success: true,
            message: message,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        // Add pagination info if provided
        if (data && data.pagination) {
            response.pagination = data.pagination;
            response.data = data.results || data.data;
        }
        
        return res.status(statusCode).json(response);
    };
    
    // Error response
    res.error = (message = 'An error occurred', statusCode = 500, errors = null) => {
        const response = {
            success: false,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        // Add validation errors if provided
        if (errors) {
            response.errors = errors;
        }
        
        // Add error code for client-side handling
        response.code = getErrorCode(statusCode);
        
        return res.status(statusCode).json(response);
    };
    
    // Validation error response
    res.validationError = (errors, message = 'Validation failed') => {
        return res.error(message, 400, errors);
    };
    
    // Unauthorized response
    res.unauthorized = (message = 'Unauthorized access') => {
        return res.error(message, 401);
    };
    
    // Forbidden response
    res.forbidden = (message = 'Access forbidden') => {
        return res.error(message, 403);
    };
    
    // Not found response
    res.notFound = (message = 'Resource not found') => {
        return res.error(message, 404);
    };
    
    // Conflict response
    res.conflict = (message = 'Resource conflict') => {
        return res.error(message, 409);
    };
    
    // Too many requests response
    res.tooManyRequests = (message = 'Too many requests') => {
        return res.error(message, 429);
    };
    
    // Server error response
    res.serverError = (message = 'Internal server error', error = null) => {
        // Log the actual error for debugging
        if (error) {
            console.error('Server Error:', error);
        }
        
        // Don't expose sensitive error details in production
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : message;
            
        return res.error(errorMessage, 500);
    };
    
    // Created response (for POST requests)
    res.created = (data = null, message = 'Resource created successfully') => {
        return res.success(data, message, 201);
    };
    
    // Updated response (for PUT/PATCH requests)
    res.updated = (data = null, message = 'Resource updated successfully') => {
        return res.success(data, message, 200);
    };
    
    // Deleted response (for DELETE requests)
    res.deleted = (message = 'Resource deleted successfully') => {
        return res.success(null, message, 200);
    };
    
    // No content response
    res.noContent = () => {
        return res.status(204).send();
    };
    
    // Paginated response
    res.paginated = (data, pagination, message = 'Success') => {
        const response = {
            success: true,
            message: message,
            data: data,
            pagination: {
                page: parseInt(pagination.page) || 1,
                limit: parseInt(pagination.limit) || 10,
                total: parseInt(pagination.total) || 0,
                pages: Math.ceil((parseInt(pagination.total) || 0) / (parseInt(pagination.limit) || 1)),
                hasNext: pagination.hasNext || false,
                hasPrev: pagination.hasPrev || false
            },
            timestamp: new Date().toISOString()
        };
        
        return res.status(200).json(response);
    };
    
    next();
};

/**
 * Get error code based on HTTP status code
 */
function getErrorCode(statusCode) {
    const codes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_SERVER_ERROR',
        502: 'BAD_GATEWAY',
        503: 'SERVICE_UNAVAILABLE'
    };
    
    return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Error handling middleware for unhandled errors
 */
const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Unhandled API Error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.validationError(err.errors, err.message);
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.unauthorized(err.message);
    }
    
    if (err.name === 'CastError') {
        return res.error('Invalid ID format', 400);
    }
    
    if (err.code === 'EBADCSRFTOKEN') {
        return res.error('Invalid CSRF token', 403);
    }
    
    if (err.code === 'ER_DUP_ENTRY') {
        return res.conflict('Resource already exists');
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.error('Referenced resource not found', 400);
    }
    
    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.serverError('Database connection failed');
    }
    
    // Default server error
    return res.serverError(err.message, err);
};

/**
 * 404 handler for API routes
 */
const notFoundHandler = (req, res) => {
    return res.notFound(`API endpoint ${req.method} ${req.originalUrl} not found`);
};

/**
 * Request logging middleware for API routes
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

/**
 * CORS helper for API responses
 */
const setCorsHeaders = (req, res, next) => {
    // Allow specific origins based on environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
};

/**
 * Rate limiting helper
 */
const createRateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // requests per window
        message = 'Too many requests from this IP'
    } = options;
    
    const store = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [ip, data] of store.entries()) {
            if (data.resetTime < now) {
                store.delete(ip);
            }
        }
        
        // Get current count for this IP
        const current = store.get(key) || { count: 0, resetTime: now + windowMs };
        
        // Reset if window has passed
        if (now > current.resetTime) {
            current.count = 0;
            current.resetTime = now + windowMs;
        }
        
        // Check if limit exceeded
        if (current.count >= max) {
            return res.tooManyRequests(message);
        }
        
        // Increment counter
        current.count++;
        store.set(key, current);
        
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
        
        next();
    };
};

module.exports = {
    apiResponse,
    errorHandler,
    notFoundHandler,
    requestLogger,
    setCorsHeaders,
    createRateLimit
};