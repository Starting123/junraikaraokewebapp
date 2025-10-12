const winston = require('winston');
const path = require('path');
const config = require('../config');

// Define log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log colors
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(logColors);

// Create logger
const logger = winston.createLogger({
    level: config.server.env === 'development' ? 'debug' : 'info',
    levels: logLevels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // All logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/exceptions.log')
        })
    ]
});

// Add console transport for development
if (config.server.env === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple()
        )
    }));
}

// Stream for Morgan
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Helper methods
logger.logError = (error, req = null) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    };
    
    if (req) {
        errorInfo.request = {
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            user: req.user ? req.user.user_id : 'anonymous'
        };
    }
    
    logger.error(errorInfo);
};

logger.logActivity = (action, user_id, details = {}) => {
    logger.info({
        type: 'user_activity',
        action,
        user_id,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.logPayment = (action, payment_data) => {
    logger.info({
        type: 'payment_activity',
        action,
        payment_data,
        timestamp: new Date().toISOString()
    });
};

logger.logBooking = (action, booking_data) => {
    logger.info({
        type: 'booking_activity',
        action,
        booking_data,
        timestamp: new Date().toISOString()
    });
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;