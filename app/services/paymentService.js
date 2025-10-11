const { stripe, stripeConfig } = require('../config/stripe');
const pool = require('../db');

class PaymentService {
    
    /**
     * สร้าง Payment Intent สำหรับการชำระเงิน
     */
    static async createPaymentIntent(bookingId, userId) {
        try {
            if (!stripe) {
                console.error('Stripe configuration missing. Ensure STRIPE_SECRET_KEY is set.');
                throw new Error('Stripe not configured');
            }

            // ดึงข้อมูลการจอง
            const [bookingRows] = await pool.query(`
                SELECT b.*, r.name as room_name, rt.type_name, rt.price_per_hour
                FROM bookings b 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE b.booking_id = ? AND b.user_id = ?
            `, [bookingId, userId]);

            if (bookingRows.length === 0) {
                throw new Error('ไม่พบการจองหรือคุณไม่มีสิทธิ์เข้าถึง');
            }

            const booking = bookingRows[0];
            
            // ตรวจสอบสถานะการชำระเงิน
            if (booking.payment_status === 'paid') {
                throw new Error('การจองนี้ชำระเงินแล้ว');
            }

            // คำนวณจำนวนเงิน (จาก total_price ในฐานข้อมูล)
            let amount = Math.round(parseFloat(booking.total_price) * 100); // Convert to satang
            
            // Debug: แสดงข้อมูลการจอง
            console.log(`Debug - Booking data:`, {
                booking_id: booking.booking_id,
                total_price: booking.total_price,
                amount_in_satang: amount,
                currency: stripeConfig.currency
            });
            
            // ตรวจสอบจำนวนเงินขั้นต่ำ (สำหรับ THB = 2000 สตางค์ = 20 บาท)
            const minimumAmount = stripeConfig.currency === 'thb' ? 2000 : 50; // 20 THB หรือ 0.50 USD
            if (amount < minimumAmount) {
                console.log(`จำนวนเงินเดิม: ${amount} สตางค์ ต่ำกว่าขั้นต่ำ ปรับเป็น: ${minimumAmount} สตางค์`);
                amount = minimumAmount;
            }

            // ดึงข้อมูลผู้ใช้
            const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
            const user = userRows[0];

            // สร้าง Customer ใน Stripe (ถ้ายังไม่มี)
            let customerId = user.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: {
                        user_id: userId.toString()
                    }
                });
                customerId = customer.id;
                
                // บันทึก customer ID ในฐานข้อมูล
                await pool.query('UPDATE users SET stripe_customer_id = ? WHERE user_id = ?', 
                    [customerId, userId]);
            }

            // สร้าง Payment Intent
            let paymentIntent;
            try {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: stripeConfig.currency,
                    customer: customerId,
                    payment_method_types: ['card', 'promptpay'],
                    metadata: {
                        booking_id: bookingId.toString(),
                        user_id: userId.toString(),
                        room_name: booking.room_name,
                        room_type: booking.type_name
                    },
                    description: `การจองห้อง ${booking.room_name} (${booking.type_name}) - ${booking.duration_hours || 1} ชั่วโมง`
                });
            } catch (error) {
                console.error('Failed to create payment intent:', error);
                throw new Error('Payment processing failed');
            }

            // บันทึก payment intent ในฐานข้อมูล
            await pool.query(`
                INSERT INTO booking_payments 
                (booking_id, amount, method, status, stripe_payment_intent_id, created_at) 
                VALUES (?, ?, 'stripe', 'pending', ?, NOW())
            `, [bookingId, booking.total_price, paymentIntent.id]);

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                currency: stripeConfig.currency,
                booking: {
                    id: booking.booking_id,
                    room_name: booking.room_name,
                    room_type: booking.type_name,
                    total_price: booking.total_price,
                    duration_hours: booking.duration_hours || 1
                }
            };

        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * ยืนยันการชำระเงิน
     */
    static async confirmPayment(paymentIntentId, bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            // ดึงข้อมูล Payment Intent จาก Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status === 'succeeded') {
                // อัปเดตสถานะการชำระเงิน
                await pool.query(`
                    UPDATE booking_payments 
                    SET status = 'paid', payment_date = NOW(), 
                        transaction_id = ?
                    WHERE stripe_payment_intent_id = ? AND booking_id = ?
                `, [paymentIntent.id, paymentIntentId, bookingId]);

                // อัปเดตสถานะการจอง
                await pool.query(`
                    UPDATE bookings 
                    SET payment_status = 'paid'
                    WHERE booking_id = ? AND user_id = ?
                `, [bookingId, userId]);

                return {
                    success: true,
                    status: 'paid',
                    transactionId: paymentIntent.id,
                    amount: paymentIntent.amount / 100
                };
            } else {
                return {
                    success: false,
                    status: paymentIntent.status,
                    message: 'การชำระเงินไม่สำเร็จ'
                };
            }

        } catch (error) {
            console.error('Error confirming payment:', error);
            throw error;
        }
    }

    /**
     * ยกเลิกการชำระเงิน
     */
    static async cancelPayment(paymentIntentId, bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            // ยกเลิก Payment Intent
            await stripe.paymentIntents.cancel(paymentIntentId);

            // อัปเดตสถานะในฐานข้อมูล
            await pool.query(`
                UPDATE booking_payments 
                SET status = 'failed'
                WHERE stripe_payment_intent_id = ? AND booking_id = ?
            `, [paymentIntentId, bookingId]);

            return {
                success: true,
                message: 'ยกเลิกการชำระเงินแล้ว'
            };

        } catch (error) {
            console.error('Error canceling payment:', error);
            throw error;
        }
    }

    /**
     * คืนเงิน
     */
    static async refundPayment(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            const refundData = {
                payment_intent: paymentIntentId,
                reason: reason
            };

            // ถ้าระบุจำนวนเงินที่จะคืน
            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to satang
            }

            const refund = await stripe.refunds.create(refundData);

            // อัปเดตสถานะในฐานข้อมูล
            await pool.query(`
                UPDATE booking_payments 
                SET status = 'refunded'
                WHERE stripe_payment_intent_id = ?
            `, [paymentIntentId]);

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            };

        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }

    /**
     * ดึงรายการการชำระเงินของผู้ใช้
     */
    static async getUserPayments(userId, limit = 10) {
        try {
            const [payments] = await pool.query(`
                SELECT bp.*, b.start_time, b.end_time, 
                       r.name as room_name, rt.type_name
                FROM booking_payments bp
                JOIN bookings b ON bp.booking_id = b.booking_id
                JOIN rooms r ON b.room_id = r.room_id
                JOIN room_types rt ON r.type_id = rt.type_id
                WHERE b.user_id = ?
                ORDER BY bp.created_at DESC
                LIMIT ?
            `, [userId, limit]);

            return payments;

        } catch (error) {
            console.error('Error getting user payments:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;