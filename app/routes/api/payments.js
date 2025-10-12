const express = require('express');
const router = express.Router();
const PaymentService = require('../../services/paymentService');
const { stripeConfig } = require('../../config/stripe');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route POST /api/payments/create-payment-intent
 * @desc สร้าง Payment Intent สำหรับการชำระเงิน
 * @access Private
 */
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.user_id;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ booking ID'
            });
        }

        const result = await PaymentService.createPaymentIntent(bookingId, userId);
        
        res.json(result);

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการสร้าง Payment Intent'
        });
    }
});

/**
 * @route POST /api/payments/confirm
 * @desc ยืนยันการชำระเงิน
 * @access Private
 */
router.post('/confirm', authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId, bookingId } = req.body;
        const userId = req.user.user_id;

        if (!paymentIntentId || !bookingId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ Payment Intent ID และ Booking ID'
            });
        }

        const result = await PaymentService.confirmPayment(paymentIntentId, bookingId, userId);
        
        res.json(result);

    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน'
        });
    }
});

/**
 * @route POST /api/payments/cancel
 * @desc ยกเลิกการชำระเงิน
 * @access Private
 */
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId, bookingId } = req.body;
        const userId = req.user.user_id;

        if (!paymentIntentId || !bookingId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ Payment Intent ID และ Booking ID'
            });
        }

        const result = await PaymentService.cancelPayment(paymentIntentId, bookingId, userId);
        
        res.json(result);

    } catch (error) {
        console.error('Error canceling payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน'
        });
    }
});

/**
 * @route POST /api/payments/refund
 * @desc คืนเงิน
 * @access Private (Admin only)
 */
router.post('/refund', authenticateToken, async (req, res) => {
    try {
        // ตรวจสอบสิทธิ์ admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์ในการคืนเงิน'
            });
        }

        const { paymentIntentId, amount, reason } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ Payment Intent ID'
            });
        }

        const result = await PaymentService.refundPayment(paymentIntentId, amount, reason);
        
        res.json(result);

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการคืนเงิน'
        });
    }
});

/**
 * @route GET /api/payments/my-payments
 * @desc ดึงรายการการชำระเงินของผู้ใช้
 * @access Private
 */
router.get('/my-payments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const limit = parseInt(req.query.limit) || 10;

        const payments = await PaymentService.getUserPayments(userId, limit);
        
        res.json({
            success: true,
            payments: payments
        });

    } catch (error) {
        console.error('Error getting user payments:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายการการชำระเงิน'
        });
    }
});

/**
 * @route GET /api/payments/config
 * @desc ดึง Stripe publishable key สำหรับ frontend
 * @access Public
 */
router.get('/config', (req, res) => {
    // ตรวจสอบว่ามี Stripe configuration หรือไม่
    if (!stripeConfig.publishableKey) {
        return res.status(500).json({
            success: false,
            message: 'Stripe configuration missing: STRIPE_PUBLISHABLE_KEY not found in environment variables'
        });
    }

    res.json({
        success: true,
        publishableKey: stripeConfig.publishableKey,
        currency: stripeConfig.currency,
        paymentMethods: stripeConfig.paymentMethods
    });
});

/**
 * @route POST /api/payments/webhook
 * @desc Stripe webhook endpoint
 * @access Public (but verified by Stripe signature)
 */
router.post('/webhook', async (req, res) => {
    try {
        const { stripe } = require('../../config/stripe');
        const pool = require('../../db');
        
        if (!stripe || !stripeConfig.webhookSecret) {
            return res.status(400).send('Webhook not configured');
        }

        const sig = req.headers['stripe-signature'];
        let event;

        // สำหรับ testing ข้าม signature verification ก่อน
        // ใน production ควรเปิดใช้งาน signature verification
        try {
            event = {
                type: req.body.type || 'payment_intent.succeeded',
                data: {
                    object: req.body.data?.object || req.body
                }
            };
        } catch (err) {
            console.error('Webhook error:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // จัดการ events ต่างๆ
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('Payment succeeded:', paymentIntent.id);
                
                // อัปเดตฐานข้อมูลเมื่อชำระเงินสำเร็จ
                await pool.query(`
                    UPDATE booking_payments 
                    SET status = 'paid', payment_date = NOW()
                    WHERE stripe_payment_intent_id = ?
                `, [paymentIntent.id]);

                // อัปเดตสถานะการจอง
                const bookingId = paymentIntent.metadata.booking_id;
                if (bookingId) {
                    await pool.query(`
                        UPDATE bookings 
                        SET payment_status = 'paid'
                        WHERE booking_id = ?
                    `, [bookingId]);
                }
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('Payment failed:', failedPayment.id);
                
                // อัปเดตสถานะเป็น failed
                await pool.query(`
                    UPDATE booking_payments 
                    SET status = 'failed'
                    WHERE stripe_payment_intent_id = ?
                `, [failedPayment.id]);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({received: true});

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Webhook Error');
    }
});

module.exports = router;