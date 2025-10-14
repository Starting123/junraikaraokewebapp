const { stripe, stripeConfig } = require('../../../core/config/stripe');
const Order = require('../../orders/models/Order');
const Booking = require('../../bookings/models/Booking');

class PaymentService {
    
    /**
     * สร้าง Payment Intent สำหรับการชำระเงิน
     */
    static async createPaymentIntent(bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า - กรุณาเพิ่ม STRIPE_SECRET_KEY ใน environment variables');
            }

            // ดึงข้อมูลการจอง
            const booking = await Booking.findById(bookingId);
            
            if (!booking || booking.user_id !== userId) {
                throw new Error('ไม่พบการจองหรือคุณไม่มีสิทธิ์เข้าถึง');
            }
            
            // ตรวจสอบสถานะการชำระเงิน
            if (booking.payment_status === 'paid') {
                throw new Error('การจองนี้ชำระเงินแล้ว');
            }

            // คำนวณจำนวนเงิน (จาก total_price ในฐานข้อมูล)
            let amount = Math.round(parseFloat(booking.total_price) * 100); // Convert to satang
            
            // ตรวจสอบจำนวนเงินขั้นต่ำ (สำหรับ THB = 2000 สตางค์ = 20 บาท)
            const minimumAmount = stripeConfig.currency === 'thb' ? 2000 : 50;
            if (amount < minimumAmount) {
                amount = minimumAmount;
            }

            // สร้าง Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: stripeConfig.currency,
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    booking_id: bookingId.toString(),
                    user_id: userId.toString(),
                    room_name: booking.room_name || '',
                    room_type: booking.type_name || ''
                },
                description: `การจองห้อง ${booking.room_name} - ${booking.type_name}`
            });

            // บันทึก Order ในฐานข้อมูล
            await Order.create({
                booking_id: bookingId,
                user_id: userId,
                total_amount: booking.total_price,
                payment_method: 'stripe',
                status: 'pending'
            });

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                currency: stripeConfig.currency,
                booking: {
                    id: booking.booking_id,
                    room_name: booking.room_name,
                    type_name: booking.type_name,
                    start_time: booking.start_time,
                    end_time: booking.end_time,
                    total_price: booking.total_price
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
    static async confirmPayment(paymentIntentId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status === 'succeeded') {
                const bookingId = paymentIntent.metadata.booking_id;
                
                // อัพเดทสถานะการจองและการชำระเงิน
                await Booking.update(bookingId, {
                    payment_status: 'paid',
                    status: 'confirmed'
                });

                // อัพเดทสถานะ Order
                await Order.updateByStripePaymentIntent(paymentIntentId, {
                    status: 'completed',
                    stripe_payment_intent_id: paymentIntentId
                });

                return {
                    success: true,
                    message: 'การชำระเงินสำเร็จ',
                    booking_id: bookingId
                };
            } else {
                return {
                    success: false,
                    message: 'การชำระเงินไม่สำเร็จ',
                    status: paymentIntent.status
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
    static async cancelPayment(paymentIntentId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
            
            if (paymentIntent.status === 'canceled') {
                const bookingId = paymentIntent.metadata.booking_id;
                
                // อัพเดทสถานะการจอง
                await Booking.update(bookingId, {
                    payment_status: 'cancelled',
                    status: 'cancelled'
                });

                // อัพเดทสถานะ Order
                await Order.updateByStripePaymentIntent(paymentIntentId, {
                    status: 'cancelled'
                });

                return {
                    success: true,
                    message: 'ยกเลิกการชำระเงินสำเร็จ',
                    booking_id: bookingId
                };
            }

        } catch (error) {
            console.error('Error canceling payment:', error);
            throw error;
        }
    }

    /**
     * รับรองการชำระเงินผ่าน Webhook
     */
    static async handleWebhook(body, signature) {
        try {
            if (!stripe || !stripeConfig.webhookSecret) {
                throw new Error('Stripe webhook ไม่ได้ตั้งค่า');
            }

            const event = stripe.webhooks.constructEvent(
                body,
                signature,
                stripeConfig.webhookSecret
            );

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.confirmPayment(event.data.object.id);
                    break;
                    
                case 'payment_intent.payment_failed':
                    const paymentIntent = event.data.object;
                    const bookingId = paymentIntent.metadata.booking_id;
                    
                    await Booking.update(bookingId, {
                        payment_status: 'failed'
                    });
                    
                    await Order.updateByStripePaymentIntent(paymentIntent.id, {
                        status: 'failed'
                    });
                    break;
                    
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            return { success: true, eventType: event.type };

        } catch (error) {
            console.error('Webhook error:', error);
            throw error;
        }
    }

    /**
     * คืนเงิน
     */
    static async refundPayment(paymentIntentId, amount = null) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            const refundData = { payment_intent: paymentIntentId };
            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to satang
            }

            const refund = await stripe.refunds.create(refundData);
            
            if (refund.status === 'succeeded') {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                const bookingId = paymentIntent.metadata.booking_id;
                
                await Booking.update(bookingId, {
                    payment_status: 'refunded',
                    status: 'cancelled'
                });

                await Order.updateByStripePaymentIntent(paymentIntentId, {
                    status: 'refunded'
                });

                return {
                    success: true,
                    message: 'คืนเงินสำเร็จ',
                    refund_id: refund.id,
                    amount: refund.amount / 100
                };
            }

        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;