const express = require('express');
const router = express.Router();

const OrderController = require('../controllers/OrderController');
const { authenticateToken, requireAdmin } = require('../../../core/middleware/auth');
const { body, param, query } = require('express-validator');

// Order validation
const orderValidators = {
    create: [
        body('booking_id')
            .isInt({ min: 1 })
            .withMessage('กรุณาระบุ booking_id ที่ถูกต้อง'),
        
        body('total_amount')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('จำนวนเงินต้องมากกว่า 0'),
        
        body('payment_method')
            .optional()
            .isIn(['stripe', 'cash', 'bank_transfer'])
            .withMessage('วิธีการชำระเงินไม่ถูกต้อง')
    ],
    
    updateStatus: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Order ID ไม่ถูกต้อง'),
        
        body('status')
            .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
            .withMessage('สถานะไม่ถูกต้อง')
    ],
    
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Order ID ไม่ถูกต้อง')
    ],
    
    getByPaymentIntent: [
        param('payment_intent_id')
            .notEmpty()
            .withMessage('Payment Intent ID ไม่ถูกต้อง')
    ]
};

// Protected routes - ต้อง login ทั้งหมด
router.use(authenticateToken);

// User routes
router.get('/', OrderController.getOrders);
router.get('/:id', orderValidators.getById, OrderController.getOrderById);
router.post('/', orderValidators.create, OrderController.createOrder);

// Payment Intent lookup
router.get('/payment-intent/:payment_intent_id', orderValidators.getByPaymentIntent, OrderController.getOrderByPaymentIntent);

// Admin only routes
router.put('/:id/status', requireAdmin, orderValidators.updateStatus, OrderController.updateOrderStatus);

module.exports = router;