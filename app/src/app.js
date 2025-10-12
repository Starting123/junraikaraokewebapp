const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import configuration and utilities
const config = require('./src/config');
const logger = require('./src/utils/Logger');
const { testConnection } = require('./src/config/database');

// Import middleware
const { 
    cors, 
    helmet, 
    createRateLimiter, 
    errorHandler, 
    notFound 
} = require('./src/middleware/security');

const { 
    requestLogger, 
    responseTime, 
    requestId 
} = require('./src/middleware/logging');

// Import routes
const authRoutes = require('./src/routes/auth');
const bookingRoutes = require('./src/routes/bookings');
const paymentRoutes = require('./src/routes/payments');

// Import old routes (temporary for compatibility)
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/api/users');
const roomsRouter = require('./routes/api/rooms');
const apiAdmin = require('./routes/api/admin');
const apiOrders = require('./routes/api/orders');

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
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

// Legacy routes (for backward compatibility)
app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/admin', apiAdmin);
app.use('/api/orders', apiOrders);

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
            auth: '/api/auth',
            bookings: '/api/bookings',
            payments: '/api/payments',
            users: '/api/users',
            rooms: '/api/rooms',
            admin: '/api/admin',
            orders: '/api/orders'
        },
        documentation: '/api-docs'
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

module.exports = app;