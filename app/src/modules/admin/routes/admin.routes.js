
const express = require('express');
const router = express.Router();

const AdminController = require('../controllers/AdminController');
const { authenticateToken, requireAdmin } = require('../../../core/middleware/auth');
const { body, param, query } = require('express-validator');

// Protected routes - ต้อง login และเป็น admin ทั้งหมด
router.use(authenticateToken);
router.use(requireAdmin);

// Page routes - Render EJS views (MUST come first)
router.get('/', AdminController.showAdminPage);  // Main admin page at /admin
router.get('/dashboard', AdminController.getDashboard);  // Keep dashboard route

// API routes for admin data (for frontend compatibility)
router.get('/api/bookings', AdminController.apiGetBookings);
router.get('/api/users', AdminController.apiGetUsers);
router.get('/api/rooms', AdminController.apiGetRooms);

// Room CRUD API
router.post('/api/rooms', AdminController.apiCreateRoom);
router.put('/api/rooms/:id', AdminController.apiUpdateRoom);
router.delete('/api/rooms/:id', AdminController.apiDeleteRoom);

// Admin statistics API
router.get('/api/stats', AdminController.getStats);

// User Management API
router.get('/api/users/list', AdminController.getUsers);
router.put('/api/users/:id/role', AdminController.updateUserRole);

// Booking Management API
router.get('/api/bookings/list', AdminController.getBookings);
router.put('/api/bookings/:id/status', [
    param('id').isInt({ min: 1 }).withMessage('Booking ID ไม่ถูกต้อง'),
    body('status').optional().isIn(['active', 'confirmed', 'cancelled', 'completed']).withMessage('สถานะไม่ถูกต้อง'),
    body('payment_status').optional().isIn(['pending', 'paid', 'failed', 'cancelled', 'refunded']).withMessage('สถานะการชำระเงินไม่ถูกต้อง')
], AdminController.updateBookingStatus);
router.delete('/api/bookings/:id', AdminController.apiDeleteBooking);

// Reports API
router.get('/api/reports/revenue', [
    query('start_date').optional().isDate().withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
    query('end_date').optional().isDate().withMessage('วันที่สิ้นสุดไม่ถูกต้อง'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('การจัดกลุ่มไม่ถูกต้อง')
], AdminController.getRevenueReport);

router.get('/api/reports/room-usage', [
    query('start_date').optional().isDate().withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
    query('end_date').optional().isDate().withMessage('วันที่สิ้นสุดไม่ถูกต้อง')
], AdminController.getRoomUsageReport);

// Settings API
router.get('/api/settings', AdminController.getSettings);

module.exports = router;