const PaymentService = require('../services/PaymentService');
const { validationResult } = require('express-validator');

class PaymentController {
    
    /**
     * แสดงหน้าชำระเงิน (Render Page)
     */
    static async showPaymentPage(req, res) {
        try {
            const { booking_id } = req.query;

            if (!booking_id) {
                return res.status(400).render('error', {
                    message: 'กรุณาระบุหมายเลขการจอง'
                });
            }

            res.render('payments/views/payment', {
                title: 'ชำระเงิน - Junrai Karaoke',
                user: req.user || null,
                booking_id: booking_id
            });

        } catch (error) {
            console.error('Show payment page error:', error);
            res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาดในการโหลดหน้าชำระเงิน',
                error: error
            });
        }
    }

    /**
     * แสดงหน้าชำระเงินสำเร็จ
     */
    static async showPaymentSuccessPage(req, res) {
        try {
            const { payment_intent } = req.query;

            res.render('payments/views/payment-success', {
                title: 'ชำระเงินสำเร็จ - Junrai Karaoke',
                user: req.user || null,
                payment_intent: payment_intent
            });

        } catch (error) {
            console.error('Show payment success page error:', error);
            res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาด',
                error: error
            });
        }
    }

    /**
     * แสดงหน้าชำระเงินยกเลิก
     */
    static async showPaymentCancelPage(req, res) {
        try {
            res.render('payments/views/payment-cancel', {
                title: 'ยกเลิกการชำระเงิน - Junrai Karaoke',
                user: req.user || null
            });

        } catch (error) {
            console.error('Show payment cancel page error:', error);
            res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาด',
                error: error
            });
        }
    }
    
    /**
     * สร้าง Payment Intent
     */
    static async createPaymentIntent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { booking_id } = req.body;
            const user_id = req.user.user_id;

            const result = await PaymentService.createPaymentIntent(booking_id, user_id);

            res.json(result);

        } catch (error) {
            console.error('Create payment intent error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการสร้าง payment intent'
            });
        }
    }

    /**
     * ยืนยันการชำระเงิน
     */
    static async confirmPayment(req, res) {
        try {
            const { payment_intent_id } = req.body;

            if (!payment_intent_id) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุ payment_intent_id'
                });
            }

            const result = await PaymentService.confirmPayment(payment_intent_id);

            res.json(result);

        } catch (error) {
            console.error('Confirm payment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน'
            });
        }
    }

    /**
     * ยกเลิกการชำระเงิน
     */
    static async cancelPayment(req, res) {
        try {
            const { payment_intent_id } = req.body;

            if (!payment_intent_id) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุ payment_intent_id'
                });
            }

            const result = await PaymentService.cancelPayment(payment_intent_id);

            res.json(result);

        } catch (error) {
            console.error('Cancel payment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน'
            });
        }
    }

    /**
     * คืนเงิน (สำหรับ admin)
     */
    static async refundPayment(req, res) {
        try {
            const { payment_intent_id, amount } = req.body;

            if (!payment_intent_id) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุ payment_intent_id'
                });
            }

            const result = await PaymentService.refundPayment(payment_intent_id, amount);

            res.json(result);

        } catch (error) {
            console.error('Refund payment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการคืนเงิน'
            });
        }
    }

    /**
     * Webhook สำหรับ Stripe
     */
    static async handleWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];
            const body = req.body;

            if (!signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing Stripe signature'
                });
            }

            const result = await PaymentService.handleWebhook(body, signature);

            res.json(result);

        } catch (error) {
            console.error('Webhook error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Webhook processing failed'
            });
        }
    }

    /**
     * ดึงข้อมูล Stripe config สำหรับ frontend
     */
    static async getStripeConfig(req, res) {
        try {
            const config = require('../../../core/config/stripe');
            
            res.json({
                success: true,
                publishableKey: config.stripeConfig.publishableKey,
                currency: config.stripeConfig.currency
            });

        } catch (error) {
            console.error('Get Stripe config error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า'
            });
        }
    }
}

module.exports = PaymentController;