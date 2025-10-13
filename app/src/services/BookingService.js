const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

class BookingService {
    
    /**
     * สร้างการจองใหม่
     */
    static async createBooking({ user_id, room_id, start_time, end_time, duration_hours }) {
        try {
            // ตรวจสอบว่าห้องมีอยู่และพร้อมใช้งาน
            const room = await Room.findById(room_id);
            if (!room) {
                throw new Error('ไม่พบห้องที่ต้องการจอง');
            }

            if (room.status !== 'available') {
                throw new Error('ห้องนี้ไม่พร้อมใช้งาน');
            }

            // ตรวจสอบว่าช่วงเวลาว่างหรือไม่
            const isAvailable = await Booking.checkTimeSlotAvailability(room_id, start_time, end_time);
            if (!isAvailable) {
                throw new Error('ช่วงเวลานี้ห้องไม่ว่าง');
            }

            // สร้างการจอง
            const booking = await Booking.create({
                user_id,
                room_id,
                start_time,
                end_time,
                duration_hours: duration_hours || this.calculateDuration(start_time, end_time)
            });

            return {
                success: true,
                message: 'จองห้องสำเร็จ',
                booking
            };

        } catch (error) {
            console.error('Booking creation error:', error);
                        // Prevent booking on Monday
                        const bookingDate = new Date(start_time);
                        if (bookingDate.getDay() === 1) {
                            throw new Error('ร้านหยุดทุกวันจันทร์ ไม่สามารถจองได้');
                        }
            throw error;
        }
    }

    /**
     * แก้ไขการจอง
     */
    static async updateBooking(booking_id, user_id, updateData, isAdmin = false) {
        try {
            // ตรวจสอบการจองที่มีอยู่
            const existingBooking = await Booking.findById(booking_id);
            if (!existingBooking) {
                throw new Error('ไม่พบการจองที่ต้องการแก้ไข');
            }

            // ตรวจสอบสิทธิ์ในการแก้ไข
            if (!isAdmin && existingBooking.user_id !== user_id) {
                throw new Error('คุณไม่มีสิทธิ์แก้ไขการจองนี้');
            }

            // ถ้าแก้ไขเวลา ต้องตรวจสอบความว่าง
            if (updateData.start_time || updateData.end_time) {
                const start_time = updateData.start_time || existingBooking.start_time;
                const end_time = updateData.end_time || existingBooking.end_time;
                
                const isAvailable = await Booking.checkTimeSlotAvailability(
                    existingBooking.room_id, 
                    start_time, 
                    end_time, 
                    booking_id
                );
                
                if (!isAvailable) {
                    throw new Error('ช่วงเวลาใหม่นี้ห้องไม่ว่าง');
                }

                // คำนวณระยะเวลาใหม่
                updateData.duration_hours = this.calculateDuration(start_time, end_time);
            }

            // อัพเดทการจอง
            const success = await Booking.update(booking_id, updateData);
            if (!success) {
                throw new Error('ไม่สามารถแก้ไขการจองได้');
            }

            const updatedBooking = await Booking.findById(booking_id);
            
            return {
                success: true,
                message: 'แก้ไขการจองสำเร็จ',
                booking: updatedBooking
            };

        } catch (error) {
            console.error('Booking update error:', error);
            throw error;
        }
    }

    /**
     * ยกเลิกการจอง
     */
    static async cancelBooking(booking_id, user_id, isAdmin = false) {
        try {
            const booking = await Booking.findById(booking_id);
            if (!booking) {
                throw new Error('ไม่พบการจองที่ต้องการยกเลิก');
            }

            // ตรวจสอบสิทธิ์
            if (!isAdmin && booking.user_id !== user_id) {
                throw new Error('คุณไม่มีสิทธิ์ยกเลิกการจองนี้');
            }

            // ตรวจสอบสถานะปัจจุบัน
            if (booking.status === 'cancelled') {
                throw new Error('การจองนี้ถูกยกเลิกแล้ว');
            }

            // ยกเลิกการจอง
            await Booking.update(booking_id, {
                status: 'cancelled',
                payment_status: 'cancelled'
            });

            return {
                success: true,
                message: 'ยกเลิกการจองสำเร็จ'
            };

        } catch (error) {
            console.error('Booking cancellation error:', error);
            throw error;
        }
    }

    /**
     * ดึงรายการการจอง
     */
    static async getBookings({ user_id, room_id, status, payment_status, isAdmin = false, limit = 200 }) {
        try {
            const bookings = await Booking.findAll({
                user_id: isAdmin ? user_id : user_id, // Admin สามารถดูการจองของผู้อื่นได้
                room_id,
                status,
                payment_status,
                isAdmin,
                limit
            });

            return {
                success: true,
                bookings
            };

        } catch (error) {
            console.error('Get bookings error:', error);
            throw error;
        }
    }

    /**
     * ดึงรายละเอียดการจอง
     */
    static async getBookingDetail(booking_id, user_id, isAdmin = false) {
        try {
            const booking = await Booking.findById(booking_id);
            if (!booking) {
                throw new Error('ไม่พบการจอง');
            }

            // ตรวจสอบสิทธิ์
            if (!isAdmin && booking.user_id !== user_id) {
                throw new Error('คุณไม่มีสิทธิ์เข้าถึงการจองนี้');
            }

            return {
                success: true,
                booking
            };

        } catch (error) {
            console.error('Get booking detail error:', error);
            throw error;
        }
    }

    /**
     * ตรวจสอบช่วงเวลาที่ว่าง
     */
    static async getAvailableTimeSlots(room_id, date) {
        try {
            const room = await Room.findById(room_id);
            if (!room) {
                throw new Error('ไม่พบห้อง');
            }

            const availableSlots = await Room.getAvailableTimeSlots(room_id, date);

            return {
                success: true,
                room: room.toJSON(),
                date,
                availableSlots
            };

        } catch (error) {
            console.error('Get available time slots error:', error);
            throw error;
        }
    }

    /**
     * คำนวณระยะเวลา (ชั่วโมง)
     */
    static calculateDuration(start_time, end_time) {
        const start = new Date(start_time);
        const end = new Date(end_time);
        const duration = (end - start) / (1000 * 60 * 60); // แปลงเป็นชั่วโมง
        return Math.max(1, Math.ceil(duration)); // อย่างน้อย 1 ชั่วโมง
    }

    /**
     * ตรวจสอบว่าการจองหมดเวลาหรือยัง
     */
    static async checkExpiredBookings() {
        try {
            const now = new Date();
            // หาการจองที่หมดเวลาแล้วแต่ยังไม่ได้ยกเลิก
            const expiredBookings = await Booking.findAll({
                status: 'active',
                // เพิ่มเงื่อนไขเวลาตามความต้องการ
            });

            for (const booking of expiredBookings) {
                const endTime = new Date(booking.end_time);
                if (endTime < now && booking.payment_status !== 'paid') {
                    // ยกเลิกการจองที่หมดเวลาและยังไม่ชำระเงิน
                    await Booking.update(booking.booking_id, {
                        status: 'expired',
                        payment_status: 'expired'
                    });
                }
            }

            return {
                success: true,
                message: `ตรวจสอบการจองที่หมดเวลาเสร็จสิ้น`
            };

        } catch (error) {
            console.error('Check expired bookings error:', error);
            throw error;
        }
    }
}

module.exports = BookingService;