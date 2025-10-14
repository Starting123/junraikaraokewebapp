const Room = require('../models/Room');
const { validationResult } = require('express-validator');

class RoomController {
    
    /**
     * แสดงหน้ารายการห้อง (Render Page)
     */
    static async showRoomsPage(req, res) {
        try {
            const rooms = await Room.findAll({});

            res.render('rooms/views/rooms', {
                title: 'รายการห้อง - Junrai Karaoke',
                user: req.user || null,
                rooms: rooms
            });

        } catch (error) {
            console.error('Show rooms page error:', error);
            res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาดในการโหลดหน้ารายการห้อง',
                error: error
            });
        }
    }

    /**
     * ดึงรายการห้อง (API)
     */
    static async getRooms(req, res) {
        try {
            const { q, type_id, status, limit } = req.query;
            
            const rooms = await Room.findAll({
                q,
                type_id: type_id ? parseInt(type_id) : undefined,
                status,
                limit: limit ? parseInt(limit) : undefined
            });

            res.json({
                success: true,
                data: rooms
            });

        } catch (error) {
            console.error('Get rooms error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง'
            });
        }
    }

    /**
     * ดึงรายละเอียดห้อง
     */
    static async getRoomById(req, res) {
        try {
            const { id } = req.params;
            const room = await Room.findById(id);

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องที่ต้องการ'
                });
            }

            res.json({
                success: true,
                data: room.toJSON()
            });

        } catch (error) {
            console.error('Get room by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง'
            });
        }
    }

    /**
     * สร้างห้องใหม่ (Admin only)
     */
    static async createRoom(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { name, type_id, capacity, status = 'available', description = '', features = '' } = req.body;

            const room = await Room.create({
                name,
                type_id,
                capacity,
                status,
                description,
                features
            });

            res.status(201).json({
                success: true,
                message: 'สร้างห้องสำเร็จ',
                data: room.toJSON()
            });

        } catch (error) {
            console.error('Create room error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง'
            });
        }
    }

    /**
     * แก้ไขห้อง (Admin only)
     */
    static async updateRoom(req, res) {
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
            const updateData = req.body;

            const success = await Room.update(id, updateData);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องที่ต้องการแก้ไข'
                });
            }

            const updatedRoom = await Room.findById(id);

            res.json({
                success: true,
                message: 'แก้ไขห้องสำเร็จ',
                data: updatedRoom.toJSON()
            });

        } catch (error) {
            console.error('Update room error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการแก้ไขห้อง'
            });
        }
    }

    /**
     * ลบห้อง (Admin only)
     */
    static async deleteRoom(req, res) {
        try {
            const { id } = req.params;

            const success = await Room.delete(id);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องที่ต้องการลบ'
                });
            }

            res.json({
                success: true,
                message: 'ลบห้องสำเร็จ'
            });

        } catch (error) {
            console.error('Delete room error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการลบห้อง'
            });
        }
    }

    /**
     * ดึงช่วงเวลาที่ว่างของห้อง
     */
    static async getAvailableSlots(req, res) {
        try {
            const { id } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุวันที่'
                });
            }

            const availableSlots = await Room.getAvailableTimeSlots(id, date);

            res.json({
                success: true,
                data: {
                    room_id: id,
                    date,
                    available_slots: availableSlots
                }
            });

        } catch (error) {
            console.error('Get available slots error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงช่วงเวลาที่ว่าง'
            });
        }
    }
}

module.exports = RoomController;