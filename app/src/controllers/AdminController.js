const User = require('../models/User');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Order = require('../models/Order');

class AdminController {
    
    /**
     * Dashboard - สถิติภาพรวม
     */
    static async getDashboard(req, res) {
        try {
            // TODO: implement actual statistics queries
            const stats = {
                totalUsers: 0,
                totalRooms: 0,
                totalBookings: 0,
                totalRevenue: 0,
                todayBookings: 0,
                activeBookings: 0
            };

            // สำหรับตอนนี้ส่งข้อมูล mock ไปก่อน
            res.json({
                success: true,
                data: {
                    stats,
                    recentBookings: [],
                    popularRooms: [],
                    recentUsers: []
                }
            });

        } catch (error) {
            console.error('Get dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล dashboard'
            });
        }
    }

    /**
     * จัดการผู้ใช้ - ดูรายการทั้งหมด
     */
    static async getUsers(req, res) {
        try {
            const { page = 1, limit = 20, search, role_id, status } = req.query;
            const offset = (page - 1) * limit;

            const users = await User.findAll({
                role_id: role_id ? parseInt(role_id) : undefined,
                status,
                limit: parseInt(limit),
                offset
            });

            // TODO: implement search functionality
            let filteredUsers = users;
            if (search) {
                filteredUsers = users.filter(user => 
                    user.name.toLowerCase().includes(search.toLowerCase()) ||
                    user.email.toLowerCase().includes(search.toLowerCase())
                );
            }

            res.json({
                success: true,
                data: {
                    users: filteredUsers.map(user => user.toJSON()),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: filteredUsers.length
                    }
                }
            });

        } catch (error) {
            console.error('Admin get users error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
            });
        }
    }

    /**
     * จัดการการจอง - ดูรายการทั้งหมด
     */
    static async getBookings(req, res) {
        try {
            const { page = 1, limit = 20, status, payment_status, room_id } = req.query;
            const offset = (page - 1) * limit;

            const bookings = await Booking.findAll({
                status,
                payment_status,
                room_id: room_id ? parseInt(room_id) : undefined,
                isAdmin: true,
                limit: parseInt(limit) * 2 // Get more to account for potential filtering
            });

            // Simple pagination (in real app, do this in database)
            const startIndex = offset;
            const endIndex = startIndex + parseInt(limit);
            const paginatedBookings = bookings.slice(startIndex, endIndex);

            res.json({
                success: true,
                data: {
                    bookings: paginatedBookings,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: bookings.length
                    }
                }
            });

        } catch (error) {
            console.error('Admin get bookings error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง'
            });
        }
    }

    /**
     * อัพเดทสถานะการจอง
     */
    static async updateBookingStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, payment_status } = req.body;

            const updateData = {};
            if (status) updateData.status = status;
            if (payment_status) updateData.payment_status = payment_status;

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุข้อมูลที่ต้องการอัพเดท'
                });
            }

            const success = await Booking.update(id, updateData);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบการจองที่ต้องการอัพเดท'
                });
            }

            const updatedBooking = await Booking.findById(id);

            res.json({
                success: true,
                message: 'อัพเดทสถานะการจองสำเร็จ',
                data: updatedBooking
            });

        } catch (error) {
            console.error('Update booking status error:', error);
            res.status(400).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะ'
            });
        }
    }

    /**
     * รายงาน - สรุปรายได้
     */
    static async getRevenueReport(req, res) {
        try {
            const { start_date, end_date, group_by = 'day' } = req.query;

            // TODO: implement actual revenue reporting
            const mockData = {
                total_revenue: 0,
                period: { start_date, end_date },
                group_by,
                data: []
            };

            res.json({
                success: true,
                data: mockData
            });

        } catch (error) {
            console.error('Get revenue report error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
            });
        }
    }

    /**
     * รายงาน - สถิติการใช้งานห้อง
     */
    static async getRoomUsageReport(req, res) {
        try {
            const { start_date, end_date } = req.query;

            // TODO: implement actual room usage reporting
            const mockData = {
                period: { start_date, end_date },
                rooms: []
            };

            res.json({
                success: true,
                data: mockData
            });

        } catch (error) {
            console.error('Get room usage report error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
            });
        }
    }

    /**
     * ระบบการตั้งค่า
     */
    static async getSettings(req, res) {
        try {
            // TODO: implement settings management
            const settings = {
                business_hours: {
                    open: '09:00',
                    close: '23:00'
                },
                booking_rules: {
                    min_duration: 1,
                    max_duration: 12,
                    advance_booking_days: 30
                },
                payment_settings: {
                    currency: 'THB',
                    tax_rate: 7
                }
            };

            res.json({
                success: true,
                data: settings
            });

        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงการตั้งค่า'
            });
        }
    }
}

module.exports = AdminController;