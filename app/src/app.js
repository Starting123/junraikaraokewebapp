const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import configuration and utilities from core
const config = require('./core/config');
const logger = require('./core/utils/Logger');
const { testConnection } = require('./core/config/database');

// Import core middleware
const { 
    cors, 
    helmet, 
    createRateLimiter, 
    errorHandler, 
    notFound 
} = require('./core/middleware/security');

const { 
    requestLogger, 
    responseTime, 
    requestId 
} = require('./core/middleware/logging');

// Import modular routes (centralized)
const moduleRoutes = require('./modules');

const app = express();

// Test database connection on startup
testConnection().then(isConnected => {
    if (isConnected) {
        logger.info('Database connection established successfully');
    } else {
        logger.error('Failed to establish database connection');
    }
});

// View engine setup
// Support both module views and global views
app.set('views', [
    path.join(__dirname, '../views'),           // Global views (partials, shared pages)
    path.join(__dirname, 'modules')             // Module-specific views
]);
app.set('view engine', 'ejs');

// Security middleware
app.use(helmet);
app.use(cors);
app.use(createRateLimiter());

// Logging middleware
app.use(requestId);
app.use(responseTime);
app.use(requestLogger(config.server.env));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Static files - public folder is at root level, not in src/
app.use(express.static(path.join(__dirname, '../public')));

// Mount all modular routes
app.use('/', moduleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.server.env,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Junrai Karaoke Web API - Modular Architecture',
        version: '2.0.0',
        modules: {
            auth: '/auth',
            bookings: '/bookings',
            payments: '/payments',
            rooms: '/rooms',
            users: '/users',
            admin: '/admin',
            orders: '/orders'
        },
        documentation: '/docs/REFACTOR_PLAN.md',
        health: '/health'
    });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server if this file is run directly
if (require.main === module) {
    const port = config.server.port;
    app.listen(port, () => {
        logger.info(`🚀 Server running on port ${port} in ${config.server.env} mode`);
        logger.info(`📊 Health check: http://localhost:${port}/health`);
        logger.info(`📚 API docs: http://localhost:${port}/api`);
    });
}

module.exports = app;