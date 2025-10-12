const express = require('express');
const router = express.Router();

const BookingController = require('../controllers/BookingController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const bookingValidators = require('../validators/bookingValidators');

// Protected routes - ต้อง login
router.use(authenticateToken);

// User routes
router.post('/', bookingValidators.createBooking, BookingController.createBooking);
router.get('/', bookingValidators.getBookings, BookingController.getBookings);
router.get('/:id', bookingValidators.getBookingById, BookingController.getBookingById);
router.put('/:id', bookingValidators.updateBooking, BookingController.updateBooking);
router.delete('/:id/cancel', BookingController.cancelBooking);

// Time slot checking
router.get('/rooms/:room_id/available-slots', bookingValidators.getAvailableTimeSlots, BookingController.getAvailableTimeSlots);

// Admin only routes
router.post('/check-expired', requireAdmin, BookingController.checkExpiredBookings);
router.get('/admin/stats', requireAdmin, BookingController.getBookingStats);

module.exports = router;