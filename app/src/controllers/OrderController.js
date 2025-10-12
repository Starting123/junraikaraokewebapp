const Order = require('../models/Order');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');

class OrderController {
    
    /**
     * ดึงรายการ orders
     */
    static async getOrders(req, res) {
        try {
            const { status, limit, offset } = req.query;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            const orders = await Order.findAll({
                user_id: isAdmin ? req.query.user_id : user_id, // Admin สามารถระบุ user_id ได้
                status,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            res.json({
                success: true,
                data: orders
            });

        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล orders'
            });
        }
    }

    /**
     * ดึงรายละเอียด order
     */
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            const order = await Order.findById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบ order'
                });
            }

            // ตรวจสอบสิทธิ์ - admin หรือเจ้าของ order
            if (!isAdmin && order.user_id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์เข้าถึง order นี้'
                });
            }

            res.json({
                success: true,
                data: order
            });

        } catch (error) {
            console.error('Get order by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล order'
            });
        }
    }

    /**
     * สร้าง order ใหม่
     */
    static async createOrder(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { booking_id, total_amount, payment_method = 'stripe' } = req.body;
            const user_id = req.user.user_id;

            // ตรวจสอบว่า booking มีอยู่และเป็นของผู้ใช้คนนี้
            const booking = await Booking.findById(booking_id);
            
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบการจองที่ระบุ'
                });
            }

            if (booking.user_id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์สร้าง order สำหรับการจองนี้'
                });
            }

            const order = await Order.create({
                booking_id,
                user_id,
                total_amount: total_amount || booking.total_price,
                payment_method
            });

            res.status(201).json({
                success: true,
                message: 'สร้าง order สำเร็จ',
                data: order
            });

        } catch (error) {
            console.error('Create order error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการสร้าง order'
            });
        }
    }

    /**
     * อัพเดท order status (Admin only)
     */
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, stripe_payment_intent_id } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุสถานะที่ต้องการอัพเดท'
                });
            }

            const updateData = { status };
            if (stripe_payment_intent_id) {
                updateData.stripe_payment_intent_id = stripe_payment_intent_id;
            }

            const success = await Order.update(id, updateData);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบ order ที่ต้องการอัพเดท'
                });
            }

            const updatedOrder = await Order.findById(id);

            res.json({
                success: true,
                message: 'อัพเดทสถานะ order สำเร็จ',
                data: updatedOrder
            });

        } catch (error) {
            console.error('Update order status error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ'
            });
        }
    }

    /**
     * ค้นหา order โดย Stripe Payment Intent ID
     */
    static async getOrderByPaymentIntent(req, res) {
        try {
            const { payment_intent_id } = req.params;

            const order = await Order.findByStripePaymentIntent(payment_intent_id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบ order สำหรับ payment intent นี้'
                });
            }

            // ตรวจสอบสิทธิ์
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            if (!isAdmin && order.user_id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์เข้าถึง order นี้'
                });
            }

            res.json({
                success: true,
                data: order
            });

        } catch (error) {
            console.error('Get order by payment intent error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการค้นหา order'
            });
        }
    }
}

module.exports = OrderController;