const express = require('express');
const router = express.Router();

const BookingController = require('../controllers/BookingController');
const { authenticateToken, requireAdmin } = require('../../../core/middleware/auth');
const bookingValidators = require('../validators/bookingValidators');

// Protected routes - ต้อง login
router.use(authenticateToken);

// Page routes - Render EJS views (MUST come before API routes)
router.get('/', BookingController.showBookingsPage);  // Main page at /bookings

// API routes - Return JSON (specific routes before params)
router.get('/api', bookingValidators.getBookings, BookingController.getBookings);
router.get('/api/:id', bookingValidators.getBookingById, BookingController.getBookingById);
router.post('/api', bookingValidators.createBooking, BookingController.createBooking);
router.put('/api/:id', bookingValidators.updateBooking, BookingController.updateBooking);
router.delete('/api/:id/cancel', BookingController.cancelBooking);

// Time slot checking API
router.get('/api/rooms/:room_id/available-slots', bookingValidators.getAvailableTimeSlots, BookingController.getAvailableTimeSlots);

// Admin only routes
router.post('/check-expired', requireAdmin, BookingController.checkExpiredBookings);
router.get('/admin/stats', requireAdmin, BookingController.getBookingStats);

module.exports = router;