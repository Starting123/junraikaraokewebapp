const express = require('express');
const router = express.Router();

const PaymentController = require('../controllers/PaymentController');
const { authenticateToken, requireAdmin } = require('../../../core/middleware/auth');
const { body } = require('express-validator');

// Public routes
router.get('/config', PaymentController.getStripeConfig);
// Webhook needs raw body, so we handle it without JSON parsing
router.post('/webhook', PaymentController.handleWebhook);

// Protected routes - ต้อง login
router.use(authenticateToken);

// Page routes - Render EJS views
router.get('/page', PaymentController.showPaymentPage);
router.get('/success', PaymentController.showPaymentSuccessPage);
router.get('/cancel', PaymentController.showPaymentCancelPage);

// Payment intent validation
const paymentIntentValidator = [
    body('booking_id')
        .isInt({ min: 1 })
        .withMessage('กรุณาระบุ booking_id ที่ถูกต้อง')
];

const paymentActionValidator = [
    body('payment_intent_id')
        .notEmpty()
        .withMessage('กรุณาระบุ payment_intent_id')
];

// User routes
router.post('/create-intent', paymentIntentValidator, PaymentController.createPaymentIntent);
router.post('/confirm', paymentActionValidator, PaymentController.confirmPayment);
router.post('/cancel', paymentActionValidator, PaymentController.cancelPayment);

// Admin only routes
router.post('/refund', requireAdmin, [
    ...paymentActionValidator,
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('จำนวนเงินต้องมากกว่า 0')
], PaymentController.refundPayment);

module.exports = router;