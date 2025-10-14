/**
 * ==========================================
 * CENTRAL MODULE LOADER
 * ==========================================
 * 
 * This file automatically loads and registers all module routes
 * in a clean, maintainable way following modular architecture.
 */

const express = require('express');
const router = express.Router();

// Import module routes
const authRoutes = require('./auth/routes/auth.routes');
const bookingRoutes = require('./bookings/routes/bookings.routes');
const paymentRoutes = require('./payments/routes/payments.routes');
const roomRoutes = require('./rooms/routes/rooms.routes');
const userRoutes = require('./users/routes/users.routes');
const adminRoutes = require('./admin/routes/admin.routes');
const orderRoutes = require('./orders/routes/orders.routes');

// Mount module routes
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/rooms', roomRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Junrai Karaoke API is running',
        timestamp: new Date().toISOString(),
        modules: [
            'auth',
            'bookings',
            'payments',
            'rooms',
            'users',
            'admin',
            'orders'
        ]
    });
});

module.exports = router;
