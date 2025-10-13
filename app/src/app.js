const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/Logger');
const { testConnection } = require('./config/database');

// Import middleware
const { 
    cors, 
    helmet, 
    createRateLimiter, 
    errorHandler, 
    notFound 
} = require('./middleware/security');

const { 
    requestLogger, 
    responseTime, 
    requestId 
} = require('./middleware/logging');

// Import new modular routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');

// Import old routes (temporary for compatibility)
const indexRouter = require('../routes/index');
const legacyUsersRouter = require('../routes/api/users');
const legacyRoomsRouter = require('../routes/api/rooms');
const legacyApiAdmin = require('../routes/api/admin');
const legacyApiOrders = require('../routes/api/orders');

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
app.set('views', path.join(__dirname, 'views'));
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

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes (New modular structure)
// Frontend auth pages (forgot/reset password)
const authPageRoutes = require('./routes/auth');
app.use('/auth', authPageRoutes);

// API Routes (New modular structure)
const authApiRoutes = require('./routes/auth');
app.use('/api/v2/auth', authApiRoutes);
app.use('/api/v2/bookings', bookingRoutes);
app.use('/api/v2/payments', paymentRoutes);
app.use('/api/v2/rooms', roomRoutes);
app.use('/api/v2/users', userRoutes);
app.use('/api/v2/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v2/orders', orderRoutes);

// Legacy routes (for backward compatibility)
app.use('/', indexRouter);
app.use('/api/users', legacyUsersRouter);
app.use('/api/rooms', legacyRoomsRouter);
app.use('/api/admin', legacyApiAdmin);
app.use('/api/orders', legacyApiOrders);

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
        message: 'Junrai Karaoke API',
        version: '2.0.0',
        endpoints: {
            v2: {
                auth: '/api/v2/auth',
                bookings: '/api/v2/bookings', 
                payments: '/api/v2/payments',
                rooms: '/api/v2/rooms',
                users: '/api/v2/users',
                admin: '/api/v2/admin',
                orders: '/api/v2/orders'
            },
            legacy: {
                users: '/api/users',
                rooms: '/api/rooms',
                admin: '/api/admin',
                orders: '/api/orders'
            }
        },
        documentation: '/api-docs',
        migration_guide: '/docs/MODULAR_ARCHITECTURE.md'
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