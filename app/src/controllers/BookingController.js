const BookingService = require('../services/BookingService');
const { validationResult } = require('express-validator');

class BookingController {
    
    /**
     * สร้างการจองใหม่
     */
    static async createBooking(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { room_id, start_time, end_time, duration_hours } = req.body;
            const user_id = req.user.user_id;

            const result = await BookingService.createBooking({
                user_id,
                room_id,
                start_time,
                end_time,
                duration_hours
            });

            res.status(201).json(result);

        } catch (error) {
            console.error('Create booking error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการจองห้อง'
            });
        }
    }

    /**
     * ดึงรายการการจอง
     */
    static async getBookings(req, res) {
        try {
            const { room_id, status, payment_status, limit } = req.query;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            const result = await BookingService.getBookings({
                user_id: isAdmin ? req.query.user_id : user_id, // Admin สามารถระบุ user_id ได้
                room_id,
                status,
                payment_status,
                isAdmin,
                limit: limit ? parseInt(limit) : undefined
            });

            res.json(result);

        } catch (error) {
            console.error('Get bookings error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงรายการการจอง'
            });
        }
    }

    /**
     * ดึงรายละเอียดการจอง
     */
    static async getBookingById(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            const result = await BookingService.getBookingDetail(id, user_id, isAdmin);

            res.json(result);

        } catch (error) {
            console.error('Get booking detail error:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'ไม่พบการจอง'
            });
        }
    }

    /**
     * แก้ไขการจอง
     */
    static async updateBooking(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;
            const updateData = req.body;

            const result = await BookingService.updateBooking(id, user_id, updateData, isAdmin);

            res.json(result);

        } catch (error) {
            console.error('Update booking error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการแก้ไขการจอง'
            });
        }
    }

    /**
     * ยกเลิกการจอง
     */
    static async cancelBooking(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;
            const isAdmin = req.user.role_id === 1;

            const result = await BookingService.cancelBooking(id, user_id, isAdmin);

            res.json(result);

        } catch (error) {
            console.error('Cancel booking error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง'
            });
        }
    }

    /**
     * ตรวจสอบช่วงเวลาที่ว่าง
     */
    static async getAvailableTimeSlots(req, res) {
        try {
            const { room_id } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุวันที่'
                });
            }

            const result = await BookingService.getAvailableTimeSlots(room_id, date);

            res.json(result);

        } catch (error) {
            console.error('Get available time slots error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงช่วงเวลาที่ว่าง'
            });
        }
    }

    /**
     * ตรวจสอบการจองที่หมดเวลา (สำหรับ admin)
     */
    static async checkExpiredBookings(req, res) {
        try {
            const result = await BookingService.checkExpiredBookings();

            res.json(result);

        } catch (error) {
            console.error('Check expired bookings error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบการจองที่หมดเวลา'
            });
        }
    }

    /**
     * สถิติการจอง (สำหรับ admin)
     */
    static async getBookingStats(req, res) {
        try {
            // TODO: implement booking statistics
            res.json({
                success: true,
                message: 'Feature coming soon'
            });

        } catch (error) {
            console.error('Get booking stats error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงสถิติ'
            });
        }
    }
}

module.exports = BookingController;