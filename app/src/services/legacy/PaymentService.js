const { stripe, stripeConfig } = require('../../config/stripe');
const pool = require('../../utils/LegacyDb');
const SimpleReceiptService = require('../SimpleReceiptService');

class LegacyPaymentService {
    
    /**
     * สร้าง Payment Intent สำหรับการชำระเงิน (Legacy version)
     */
    static async createPaymentIntent(bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า - กรุณาเพิ่ม STRIPE_SECRET_KEY ใน environment variables');
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
            
            // ตรวจสอบจำนวนเงินขั้นต่ำ (สำหรับ THB = 2000 สตางค์ = 20 บาท)
            const minimumAmount = stripeConfig.currency === 'thb' ? 2000 : 50; // 20 THB หรือ 0.50 USD
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
            console.error('Legacy Payment Service - Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * ยืนยันการชำระเงิน (Legacy version)
     */
    static async confirmPayment(paymentIntentId, bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า - กรุณาเพิ่ม STRIPE_SECRET_KEY ใน environment variables');
            }

            // ดึงข้อมูล Payment Intent จาก Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (!paymentIntent) {
                throw new Error('ไม่พบ Payment Intent');
            }

            // ตรวจสอบสถานะการชำระเงิน
            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`การชำระเงินยังไม่สำเร็จ (สถานะ: ${paymentIntent.status})`);
            }

            console.log('💰 Starting payment confirmation for booking:', bookingId);
            console.log('💳 Payment Intent Amount:', paymentIntent.amount, 'cents');

            // เริ่ม transaction
            await pool.query('START TRANSACTION');

            try {
                // บันทึกข้อมูลใน booking_payments ก่อน
                const [paymentResult] = await pool.query(`
                    INSERT INTO booking_payments 
                    (booking_id, amount, method, status, transaction_id, payment_date, stripe_payment_intent_id) 
                    VALUES (?, ?, 'stripe', 'paid', ?, NOW(), ?)
                `, [
                    bookingId, 
                    paymentIntent.amount / 100, // Convert from cents to baht
                    paymentIntent.id,
                    paymentIntentId
                ]);

                console.log('✅ Inserted booking_payments record ID:', paymentResult.insertId);

                // อัปเดตสถานะการจองในฐานข้อมูล
                const [updateResult] = await pool.query(`
                    UPDATE bookings 
                    SET payment_status = 'paid'
                    WHERE booking_id = ? AND user_id = ?
                `, [bookingId, userId]);

                if (updateResult.affectedRows === 0) {
                    throw new Error('ไม่พบการจองหรือไม่สามารถอัปเดตได้');
                }

                console.log('✅ Updated booking status to paid');

                // Commit transaction
                await pool.query('COMMIT');

            } catch (transactionError) {
                // Rollback transaction on error
                await pool.query('ROLLBACK');
                console.error('❌ Transaction failed, rolled back:', transactionError);
                throw transactionError;
            }

            // ดึงข้อมูลการจองที่อัปเดตแล้ว
            const [bookingRows] = await pool.query(`
                SELECT b.*, r.name as room_name, rt.type_name
                FROM bookings b 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE b.booking_id = ?
            `, [bookingId]);

            // ดึงข้อมูลผู้ใช้
            const [userRows] = await pool.query(`
                SELECT user_id, name, email FROM users WHERE user_id = ?
            `, [userId]);

            const booking = bookingRows[0];
            const user = userRows[0];

            // สร้างใบเสร็จ PDF
            let receipt = null;
            try {
                const receiptNumber = SimpleReceiptService.generateReceiptNumber();
                
                // ใช้ SimpleReceiptService แทน (ตามแนวคิดตัวอย่าง)
                receipt = await SimpleReceiptService.generateSimpleReceipt({
                    booking: booking,
                    user: user,
                    payment: {
                        paymentIntentId: paymentIntent.id,
                        status: paymentIntent.status,
                        amount: paymentIntent.amount
                    },
                    receiptNumber: receiptNumber
                });
                
                console.log('✅ สร้างใบเสร็จสำเร็จ:', receipt.fileName);
                console.log('📝 รองรับภาษาไทย:', receipt.thaiSupport ? 'ใช่' : 'ไม่');
                
                // เพิ่ม URL สำหรับดาวน์โหลด (SimpleReceiptService ส่งมาในตัวแล้ว)
                receipt.directUrl = receipt.downloadUrl;
                
                // บันทึกข้อมูลใบเสร็จลงฐานข้อมูล
                try {
                    await pool.query(`
                        UPDATE bookings 
                        SET receipt_path = ?, 
                            receipt_filename = ?, 
                            receipt_number = ?, 
                            receipt_created_at = NOW()
                        WHERE booking_id = ?
                    `, [receipt.filePath, receipt.fileName, receiptNumber, bookingId]);
                    
                    console.log('✅ บันทึกข้อมูลใบเสร็จลงฐานข้อมูลสำเร็จ');
                } catch (dbError) {
                    console.error('⚠️ ไม่สามารถบันทึกข้อมูลใบเสร็จลงฐานข้อมูล:', dbError.message);
                    // ไฟล์ PDF ยังคงสร้างสำเร็จ จึงไม่ throw error
                }
                
            } catch (receiptError) {
                console.error('⚠️ ไม่สามารถสร้างใบเสร็จได้:', receiptError.message);
                // ไม่ throw error เพราะการชำระเงินสำเร็จแล้ว
            }

            return {
                success: true,
                message: 'การชำระเงินสำเร็จ',
                booking: booking,
                user: user,
                paymentIntent: {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount
                },
                receipt: receipt // ข้อมูลใบเสร็จ
            };

        } catch (error) {
            console.error('Legacy Payment Service - Error confirming payment:', error);
            throw error;
        }
    }

    /**
     * ยกเลิกการชำระเงิน (Legacy version)
     */
    static async cancelPayment(paymentIntentId, bookingId, userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            // ยกเลิก Payment Intent ใน Stripe
            const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
            
            // อัปเดตสถานะการจองในฐานข้อมูล
            const [updateResult] = await pool.query(`
                UPDATE bookings 
                SET payment_status = 'cancelled', updated_at = NOW()
                WHERE booking_id = ? AND user_id = ?
            `, [bookingId, userId]);

            return {
                success: true,
                message: 'ยกเลิกการชำระเงินสำเร็จ',
                paymentIntent: paymentIntent
            };

        } catch (error) {
            console.error('Error cancelling payment:', error);
            throw error;
        }
    }

    /**
     * คืนเงิน (Legacy version)
     */
    static async refundPayment(paymentIntentId, amount, reason) {
        try {
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ตั้งค่า');
            }

            // สร้าง refund ใน Stripe
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount,
                reason: reason || 'requested_by_customer'
            });

            return {
                success: true,
                message: 'คืนเงินสำเร็จ',
                refund: refund
            };

        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }

    /**
     * ดึงประวัติการชำระเงินของผู้ใช้ (Legacy version)
     */
    static async getUserPayments(userId, limit = 10) {
        try {
            const [paymentRows] = await pool.query(`
                SELECT 
                    b.booking_id,
                    b.payment_status,
                    b.total_price,
                    b.start_time,
                    b.end_time,
                    b.created_at,
                    r.name as room_name,
                    rt.type_name
                FROM bookings b 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE b.user_id = ? AND b.payment_status IS NOT NULL
                ORDER BY b.created_at DESC
                LIMIT ?
            `, [userId, limit]);

            return {
                success: true,
                payments: paymentRows
            };

        } catch (error) {
            console.error('Error fetching user payments:', error);
            throw error;
        }
    }

    /**
     * ประมวลผลการชำระเงินโดยตรง (ไม่ผ่าน Stripe)
     * สำหรับการชำระเงินสด, โอนเงิน, QR Code
     */
    static async processDirectPayment(bookingId, method = 'cash', transactionId = null, userId = null) {
        try {
            // ดึงข้อมูลการจอง
            const [bookingRows] = await pool.query(`
                SELECT b.*, r.name as room_name, rt.type_name, rt.price_per_hour
                FROM bookings b 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE b.booking_id = ?
            `, [bookingId]);

            if (bookingRows.length === 0) {
                throw new Error('ไม่พบการจอง');
            }

            const booking = bookingRows[0];
            
            // ตรวจสอบสถานะการชำระเงิน
            if (booking.payment_status === 'paid') {
                throw new Error('การจองนี้ชำระเงินแล้ว');
            }

            // เริ่ม transaction
            await pool.query('START TRANSACTION');

            try {
                // สร้าง payment record
                const [paymentResult] = await pool.query(`
                    INSERT INTO booking_payments 
                    (booking_id, amount, method, status, transaction_id, payment_date) 
                    VALUES (?,?,?,?,?,NOW())
                `, [bookingId, booking.total_price, method, 'completed', transactionId]);

                // อัปเดตสถานะการจอง
                const [updateResult] = await pool.query(`
                    UPDATE bookings SET payment_status = 'paid' WHERE booking_id = ?
                `, [bookingId]);

                // ดึงข้อมูลผู้ใช้
                const [userRows] = await pool.query(`
                    SELECT user_id, name, email FROM users WHERE user_id = ?
                `, [userId || booking.user_id]);

                const user = userRows[0] || { user_id: booking.user_id, name: 'ลูกค้า', email: '' };

                // สร้างใบเสร็จ PDF
                let receipt = null;
                try {
                    const receiptNumber = SimpleReceiptService.generateReceiptNumber();
                    
                    receipt = await SimpleReceiptService.generateSimpleReceipt({
                        booking: booking,
                        user: user,
                        payment: {
                            method: method,
                            transaction_id: transactionId,
                            amount: booking.total_price,
                            payment_date: new Date()
                        },
                        receiptNumber: receiptNumber
                    });
                    
                    // บันทึกข้อมูลใบเสร็จในฐานข้อมูล
                    await pool.query(`
                        UPDATE bookings 
                        SET receipt_path = ?, receipt_filename = ?, receipt_number = ?, receipt_created_at = NOW()
                        WHERE booking_id = ?
                    `, [receipt.filePath, receipt.fileName, receiptNumber, bookingId]);
                    
                    console.log('✅ สร้างใบเสร็จสำเร็จ:', receipt.fileName);
                    
                } catch (receiptError) {
                    console.error('❌ เกิดข้อผิดพลาดในการสร้างใบเสร็จ:', receiptError);
                    // ไม่ throw error เพื่อไม่ให้กระทบการชำระเงิน
                }

                // Commit transaction
                await pool.query('COMMIT');

                return {
                    success: true,
                    payment: {
                        payment_id: paymentResult.insertId,
                        booking_id: bookingId,
                        amount: booking.total_price,
                        method: method,
                        status: 'completed',
                        transaction_id: transactionId
                    },
                    receipt: receipt
                };

            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Error processing direct payment:', error);
            throw error;
        }
    }
}

module.exports = LegacyPaymentService;