const express = require('express');
const router = express.Router();

const AdminController = require('../controllers/AdminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Protected routes - ต้อง login และเป็น admin ทั้งหมด
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// User Management
router.get('/users', AdminController.getUsers);

// Booking Management  
router.get('/bookings', AdminController.getBookings);
router.put('/bookings/:id/status', [
    param('id').isInt({ min: 1 }).withMessage('Booking ID ไม่ถูกต้อง'),
    body('status').optional().isIn(['active', 'confirmed', 'cancelled', 'completed']).withMessage('สถานะไม่ถูกต้อง'),
    body('payment_status').optional().isIn(['pending', 'paid', 'failed', 'cancelled', 'refunded']).withMessage('สถานะการชำระเงินไม่ถูกต้อง')
], AdminController.updateBookingStatus);

// Reports
router.get('/reports/revenue', [
    query('start_date').optional().isDate().withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
    query('end_date').optional().isDate().withMessage('วันที่สิ้นสุดไม่ถูกต้อง'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('การจัดกลุ่มไม่ถูกต้อง')
], AdminController.getRevenueReport);

router.get('/reports/room-usage', [
    query('start_date').optional().isDate().withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
    query('end_date').optional().isDate().withMessage('วันที่สิ้นสุดไม่ถูกต้อง')
], AdminController.getRoomUsageReport);

// Settings
router.get('/settings', AdminController.getSettings);

module.exports = router;