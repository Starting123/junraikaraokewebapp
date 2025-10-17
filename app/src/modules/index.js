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

// Homepage route


// Legacy frontend route support: redirect /auth/login to /api/auth/login
router.get('/auth/login', (req, res) => {
    res.redirect('/api/auth/login');
});

// Legacy frontend route support: redirect /admin to /api/admin
// Legacy frontend route support: render admin page at /admin
// Legacy frontend route support: render auth page at /auth
router.get('/auth', require('./auth/controllers/AuthController').showLoginForm);
router.get('/admin', require('./admin/controllers/AdminController').showAdminPage);

// Legacy frontend route support: render main page for each module
router.get('/bookings', require('./bookings/controllers/BookingController').showBookingsPage);
router.get('/payments', require('./payments/controllers/PaymentController').showPaymentPage);

// Legacy receipts page route
router.get('/receipts', (req, res) => {
    res.render('receipts', {
        title: 'ใบเสร็จของฉัน - Junrai Karaoke',
        user: req.user || null
    });
});
router.get('/rooms', require('./rooms/controllers/RoomController').showRoomsPage);
router.get('/users', require('./users/controllers/UserController').showUsersPage);
router.get('/orders', require('./orders/controllers/OrderController').showOrdersPage);

// Homepage route
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Junrai Karaoke',
        user: req.user || null
    });
});

// Dashboard route
router.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        title: 'Dashboard - Junrai Karaoke',
        user: req.user || null
    });
});

// Contact route
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - Junrai Karaoke',
        user: req.user || null
    });
});

// Mount module routes
// First mount static/page routes (without /api prefix)
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);

// Then mount API routes with /api prefix
router.use('/api/auth', authRoutes);
router.use('/api/bookings', bookingRoutes);
router.use('/api/payments', paymentRoutes);
router.use('/api/rooms', roomRoutes);
router.use('/api/users', userRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/orders', orderRoutes);

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
