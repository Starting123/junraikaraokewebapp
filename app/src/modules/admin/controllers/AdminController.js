const User = require('../../auth/models/User');
const Booking = require('../../bookings/models/Booking');
const Room = require('../../rooms/models/Room');
const Order = require('../../orders/models/Order');

class AdminController {
    
    /**
     * แสดงหน้า Admin Dashboard (Render Page)
     */
    static async showAdminPage(req, res) {
        try {
            // ดึงข้อมูลสำหรับ dashboard
            const users = await User.findAll();
            const bookings = await Booking.findAll();
            const rooms = await Room.findAll({});

            // คำนวณสถิติพื้นฐาน
            const stats = {
                totalUsers: users.length,
                totalBookings: bookings.length,
                totalRooms: rooms.length,
                pendingBookings: bookings.filter(b => b.status === 'pending').length
            };

            res.render('admin/views/admin', {
                title: 'Admin Dashboard - Junrai Karaoke',
                user: req.user || null,
                users: users,
                bookings: bookings,
                rooms: rooms,
                stats: stats
            });

        } catch (error) {
            console.error('Show admin page error:', error);
            res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาดในการโหลดหน้า Admin',
                error: error
            });
        }
    }
    
    // API: Delete a booking
    static async apiDeleteBooking(req, res) {
        try {
            const id = req.params.id;
            const booking = await Booking.findById(id);
            if (!booking) {
                return res.status(404).json({ success: false, message: 'ไม่พบการจองนี้' });
            }
            await Booking.delete(id);
            res.json({ success: true, message: 'ลบการจองสำเร็จ' });
        } catch (error) {
            console.error('API delete booking error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // API: Update user role
    static async updateUserRole(req, res) {
        try {
            const id = req.params.id;
            const { role_id } = req.body;
            if (!role_id) {
                return res.status(400).json({ success: false, message: 'กรุณาระบุประเภทผู้ใช้ (role_id)' });
            }
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
            }
            await User.update(id, { role_id });
            const updatedUser = await User.findById(id);
            res.json({ success: true, data: { user: updatedUser.toJSON ? updatedUser.toJSON() : updatedUser } });
        } catch (error) {
            console.error('API update user role error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // API: Get user details by ID
    static async apiGetUserById(req, res) {
        try {
            const id = req.params.id;
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
            }
            res.json({ success: true, data: { user: user.toJSON ? user.toJSON() : user } });
        } catch (error) {
            console.error('API get user by id error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // API: Create a new room
    static async apiCreateRoom(req, res) {
        try {
            const Room = require('../models/Room');
            const { name, type_id, capacity, status } = req.body;
            if (!name || !type_id || !capacity || !status) {
                return res.status(400).json({ success: false, message: 'ข้อมูลห้องไม่ครบถ้วน' });
            }
            const newRoom = await Room.create({ name, type_id, capacity, status });
            res.json({ success: true, data: { room: newRoom } });
        } catch (error) {
            console.error('API create room error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // API: Update a room
    static async apiUpdateRoom(req, res) {
        try {
            const Room = require('../models/Room');
            const id = req.params.id;
            const { name, type_id, capacity, status } = req.body;
            const room = await Room.findById(id);
            if (!room) {
                return res.status(404).json({ success: false, message: 'ไม่พบห้องนี้' });
            }
            await Room.update(id, { name, type_id, capacity, status });
            const updatedRoom = await Room.findById(id);
            res.json({ success: true, data: { room: updatedRoom } });
        } catch (error) {
            console.error('API update room error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // API: Delete a room
    static async apiDeleteRoom(req, res) {
        try {
            const Room = require('../models/Room');
            const id = req.params.id;
            const room = await Room.findById(id);
            if (!room) {
                return res.status(404).json({ success: false, message: 'ไม่พบห้องนี้' });
            }
            await Room.delete(id);
            res.json({ success: true, message: 'ลบห้องสำเร็จ' });
        } catch (error) {
            console.error('API delete room error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // API: Get all bookings (array)
    static async apiGetBookings(req, res) {
        try {
            const bookings = await require('../models/Booking').findAll({ isAdmin: true, limit: 100 });
            res.json({ success: true, data: { bookings: bookings.map(b => b.toJSON ? b.toJSON() : b) } });
        } catch (error) {
            console.error('API get bookings error:', error);
            res.json({ success: false, data: { bookings: [] }, error: error.message });
        }
    }

    // API: Get all users (array)
    static async apiGetUsers(req, res) {
        try {
            const users = await require('../models/User').findAll(100, 0);
            res.json({ success: true, data: { users: users.map(u => u.toJSON ? u.toJSON() : u) } });
        } catch (error) {
            console.error('API get users error:', error);
            res.json({ success: false, data: { users: [] }, error: error.message });
        }
    }

    // API: Get all rooms (array)
    static async apiGetRooms(req, res) {
        try {
            const rooms = await require('../models/Room').findAll({ limit: 100 });
            res.json({ success: true, data: { rooms: rooms.map(r => r.toJSON ? r.toJSON() : r) } });
        } catch (error) {
            console.error('API get rooms error:', error);
            res.json({ success: false, data: { rooms: [] }, error: error.message });
        }
    }

    /**
     * Admin Stats API - returns dashboard statistics
     */
    static async getStats(req, res) {
        try {
            // Total users
            const [[{ totalUsers }]] = await require('../config/database').promisePool.query(
                'SELECT COUNT(*) AS totalUsers FROM users'
            );

            // New users today
            const today = new Date();
            today.setHours(0,0,0,0);
            const todayStr = today.toISOString().slice(0, 10);
            const [[{ usersChange }]] = await require('../config/database').promisePool.query(
                'SELECT COUNT(*) AS usersChange FROM users WHERE DATE(created_at) = ?', [todayStr]
            );

            // Total rooms
            const [[{ totalRooms }]] = await require('../config/database').promisePool.query(
                'SELECT COUNT(*) AS totalRooms FROM rooms'
            );

            // Available rooms
            const [[{ roomsAvailable }]] = await require('../config/database').promisePool.query(
                "SELECT COUNT(*) AS roomsAvailable FROM rooms WHERE status = 'available'"
            );

            // Total bookings today
            const [[{ totalBookings }]] = await require('../config/database').promisePool.query(
                'SELECT COUNT(*) AS totalBookings FROM bookings WHERE DATE(created_at) = ?', [todayStr]
            );

            // New bookings today
            const [[{ bookingsChange }]] = await require('../config/database').promisePool.query(
                'SELECT COUNT(*) AS bookingsChange FROM bookings WHERE DATE(created_at) = ?', [todayStr]
            );

            // Total revenue today
            const [[{ totalRevenue }]] = await require('../config/database').promisePool.query(
                'SELECT IFNULL(SUM(total_price),0) AS totalRevenue FROM bookings WHERE DATE(created_at) = ?', [todayStr]
            );

            // Revenue change (today vs yesterday)
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);
            const [[{ yesterdayRevenue }]] = await require('../config/database').promisePool.query(
                'SELECT IFNULL(SUM(total_price),0) AS yesterdayRevenue FROM bookings WHERE DATE(created_at) = ?', [yesterdayStr]
            );
            const revenueChange = totalRevenue - yesterdayRevenue;

            res.json({
                totalUsers,
                usersChange,
                totalRooms,
                roomsAvailable,
                totalBookings,
                bookingsChange,
                totalRevenue,
                revenueChange
            });
        } catch (error) {
            console.error('Admin getStats error:', error);
            res.status(500).json({
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
                error: error.message
            });
        }
    }
    
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
