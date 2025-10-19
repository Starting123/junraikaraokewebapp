const { validationResult } = require('express-validator');

const AuthService = require('../services/AuthService');
const MailService = require('../services/MailService');

class AuthController {
    /**
     * ลืมรหัสผ่าน - ส่งอีเมลรีเซ็ต
     */
    static async forgotPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
        }

        try {
            const { token } = await AuthService.requestPasswordReset(email);
            await MailService.sendResetPasswordEmail(email, token);

            return res.json({
                success: true,
                message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว'
            });
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            });
        }
    }

    /**
     * รีเซ็ตรหัสผ่านด้วย token
     */
    static async resetPassword(req, res) {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านใหม่' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านไม่ตรงกัน' });
        }

        try {
            await AuthService.resetPassword(token, password);
            return res.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            });
        }
    }
    
    /**
     * ลงทะเบียนผู้ใช้ใหม่
     */
    static async register(req, res) {
        try {
            // ตรวจสอบ validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { name, email, password, role_id } = req.body;
            
            const result = await AuthService.register({
                name,
                email,
                password,
                role_id
            });

            res.status(201).json(result);

        } catch (error) {
            console.error('Register error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
            });
        }
    }

    /**
     * เข้าสู่ระบบ
     */
    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;
            
            const result = await AuthService.login({ email, password });

            res.json(result);

        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
            });
        }
    }

    /**
     * รีเฟรช token
     */
    static async refreshToken(req, res) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบ token'
                });
            }

            const result = await AuthService.refreshToken(token);
            res.json(result);

        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'ไม่สามารถรีเฟรช token ได้'
            });
        }
    }

    /**
     * ออกจากระบบ
     */
    static async logout(req, res) {
        try {
            // สำหรับ JWT เราไม่จำเป็นต้องทำอะไรเพิ่มเติม
            // เพียงแค่ client ลบ token ออกจาก storage
            res.json({
                success: true,
                message: 'ออกจากระบบสำเร็จ'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
            });
        }
    }

    /**
     * ตรวจสอบสถานะผู้ใช้ปัจจุบัน
     */
    static async getProfile(req, res) {
        try {
            const user = req.user;
            
            res.json({
                success: true,
                user
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
            });
        }
    }

    /**
     * เปลี่ยนรหัสผ่าน
     */
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: errors.array()
                });
            }

            const { oldPassword, newPassword } = req.body;
            const user_id = req.user.user_id;

            const result = await AuthService.changePassword({
                user_id,
                oldPassword,
                newPassword
            });

            res.json(result);

        } catch (error) {
            console.error('Change password error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
            });
        }
    }

    /**
     * ตรวจสอบ token
     */
    static async verifyToken(req, res) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบ token'
                });
            }

            const result = await AuthService.verifyToken(token);
            res.json(result);

        } catch (error) {
            console.error('Verify token error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Token ไม่ถูกต้อง'
            });
        }
    }
}

module.exports = AuthController;
