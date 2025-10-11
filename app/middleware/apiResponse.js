/**
 * ==========================================
 * API Response Standardization Helper
 * ==========================================
 */

class ApiResponse {
    /**
     * Success response format
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Error response format
     */
    static error(res, error, statusCode = 500, details = null) {
        const message = typeof error === 'string' ? error : error.message || 'Internal server error';
        
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };
        
        if (details) {
            response.details = details;
        }
        
        // Add stack trace in development
        if (process.env.NODE_ENV === 'development' && error.stack) {
            response.stack = error.stack;
        }
        
        return res.status(statusCode).json(response);
    }
    
    /**
     * Validation error response
     */
    static validationError(res, errors) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: {
                errors: Array.isArray(errors) ? errors : errors.array()
            },
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Not found response
     */
    static notFound(res, resource = 'Resource') {
        return res.status(404).json({
            success: false,
            error: `${resource} not found`,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Unauthorized response
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return res.status(401).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Forbidden response
     */
    static forbidden(res, message = 'Access forbidden') {
        return res.status(403).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Conflict response (for booking conflicts, etc.)
     */
    static conflict(res, message, details = null) {
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };
        
        if (details) {
            response.details = details;
        }
        
        return res.status(409).json(response);
    }
    
    /**
     * Paginated response format
     */
    static paginated(res, data, pagination, message = 'Success') {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page: parseInt(pagination.page) || 1,
                limit: parseInt(pagination.limit) || 20,
                total: pagination.total || 0,
                totalPages: Math.ceil((pagination.total || 0) / (parseInt(pagination.limit) || 20))
            },
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = ApiResponse;