const User = require('../models/User');
const AuthService = require('../services/AuthService');
const { validationResult } = require('express-validator');

class UserController {
    
    /**
     * ดึงรายการผู้ใช้ (Admin only)
     */
    static async getUsers(req, res) {
        try {
            const { role_id, status, limit, offset } = req.query;
            
            const users = await User.findAll({
                role_id: role_id ? parseInt(role_id) : undefined,
                status,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            res.json({
                success: true,
                data: users.map(user => user.toJSON())
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
            });
        }
    }

    /**
     * ดึงรายละเอียดผู้ใช้
     */
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const currentUser = req.user;

            // ตรวจสอบสิทธิ์ - admin หรือเจ้าของ account
            if (!AuthService.canAccessResource(currentUser, parseInt(id))) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
                });
            }

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้'
                });
            }

            res.json({
                success: true,
                data: user.toJSON()
            });

        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
            });
        }
    }

    /**
     * อัพเดทข้อมูลผู้ใช้
     */
    static async updateUser(req, res) {
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
            const currentUser = req.user;
            const updateData = req.body;

            // ตรวจสอบสิทธิ์
            if (!AuthService.canAccessResource(currentUser, parseInt(id))) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้'
                });
            }

            // ถ้าไม่ใช่ admin ไม่ให้แก้ไข role_id
            if (!AuthService.isAdmin(currentUser)) {
                delete updateData.role_id;
                delete updateData.status;
            }

            const success = await User.update(id, updateData);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข'
                });
            }

            const updatedUser = await User.findById(id);

            res.json({
                success: true,
                message: 'อัพเดทข้อมูลสำเร็จ',
                data: updatedUser.toJSON()
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล'
            });
        }
    }

    /**
     * ลบผู้ใช้ (Admin only)
     */
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // ไม่ให้ลบตัวเอง
            if (req.user.user_id === parseInt(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่สามารถลบบัญชีตัวเองได้'
                });
            }

            const success = await User.delete(id);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้ที่ต้องการลบ'
                });
            }

            res.json({
                success: true,
                message: 'ลบผู้ใช้สำเร็จ'
            });

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้'
            });
        }
    }

    /**
     * เปลี่ยนสถานะผู้ใช้ (Admin only)
     */
    static async changeUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive', 'suspended'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'สถานะไม่ถูกต้อง'
                });
            }

            const success = await User.update(id, { status });

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้'
                });
            }

            res.json({
                success: true,
                message: 'เปลี่ยนสถานะผู้ใช้สำเร็จ'
            });

        } catch (error) {
            console.error('Change user status error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ'
            });
        }
    }
}

module.exports = UserController;