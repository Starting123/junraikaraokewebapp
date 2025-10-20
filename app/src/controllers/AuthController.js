const AuthService = require('../services/AuthService');
const { validationResult } = require('express-validator');
const sendResponse = require('../utils/sendResponse');

class AuthController {
    /**
     * ลืมรหัสผ่าน - ส่ง OTP 6 หลักทางอีเมล
     */
    static async forgotPassword(req, res) {
        const { email } = req.body;
        if (!email) return sendResponse(res, false, 'กรุณากรอกอีเมล');
        try {
            const { user, otp } = await AuthService.requestPasswordReset(email);
            const MailService = require('../services/MailService');
            await MailService.sendResetPasswordOTP(email, otp);
            return sendResponse(res, true, 'ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบอีเมลของคุณ');
        } catch (err) {
            return sendResponse(res, false, err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }

    /**
     * ยืนยัน OTP
     */
    static async verifyOTP(req, res) {
        const { otp } = req.body;
        if (!otp) return sendResponse(res, false, 'กรุณากรอกรหัส OTP');
        try {
            await AuthService.verifyResetOTP(otp);
            return sendResponse(res, true, 'รหัส OTP ถูกต้อง');
        } catch (err) {
            return sendResponse(res, false, err.message || 'รหัส OTP ไม่ถูกต้อง');
        }
    }

    /**
     * รีเซ็ตรหัสผ่านด้วย OTP
     */
    static async resetPasswordWithOTP(req, res) {
        const { otp, password, confirmPassword } = req.body;
        
        if (!otp) return sendResponse(res, false, 'กรุณากรอกรหัส OTP');
        if (!password || !confirmPassword) return sendResponse(res, false, 'กรุณากรอกรหัสผ่านใหม่');
        if (password !== confirmPassword) return sendResponse(res, false, 'รหัสผ่านไม่ตรงกัน');
        
        try {
            await AuthService.resetPasswordWithOTP(otp, password);
            return sendResponse(res, true, 'รีเซ็ตรหัสผ่านสำเร็จ');
        } catch (err) {
            return sendResponse(res, false, err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }

    /**
     * รีเซ็ตรหัสผ่านด้วย token (legacy)
     */
    static async resetPassword(req, res) {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        if (!password || !confirmPassword) return sendResponse(res, false, 'กรุณากรอกรหัสผ่านใหม่');
        if (password !== confirmPassword) return sendResponse(res, false, 'รหัสผ่านไม่ตรงกัน');
        try {
            await AuthService.resetPassword(token, password);
            return sendResponse(res, true, 'รีเซ็ตรหัสผ่านสำเร็จ');
        } catch (err) {
            return sendResponse(res, false, err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
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
                return sendResponse(res, false, 'ข้อมูลไม่ถูกต้อง', { errors: errors.array() });
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
                return sendResponse(res, false, 'ข้อมูลไม่ถูกต้อง', { errors: errors.array() });
            }
            const { email, password } = req.body;
            const result = await AuthService.login({ email, password });
            return sendResponse(res, true, 'เข้าสู่ระบบสำเร็จ', result);
        } catch (error) {
            console.error('Login error:', error);
            return sendResponse(res, false, error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
                return sendResponse(res, false, 'ไม่พบ token');
            }
            const result = await AuthService.refreshToken(token);
            return sendResponse(res, true, 'รีเฟรช token สำเร็จ', result);
        } catch (error) {
            console.error('Refresh token error:', error);
            return sendResponse(res, false, error.message || 'ไม่สามารถรีเฟรช token ได้');
        }
    }

    /**
     * ออกจากระบบ
     */
    static async logout(req, res) {
        try {
            // สำหรับ JWT เราไม่จำเป็นต้องทำอะไรเพิ่มเติม
            // เพียงแค่ client ลบ token ออกจาก storage
            return sendResponse(res, true, 'ออกจากระบบสำเร็จ');
        } catch (error) {
            console.error('Logout error:', error);
            return sendResponse(res, false, 'เกิดข้อผิดพลาดในการออกจากระบบ');
        }
    }

    /**
     * ตรวจสอบสถานะผู้ใช้ปัจจุบัน
     */
    static async getProfile(req, res) {
        try {
            const user = req.user;
            return sendResponse(res, true, 'ดึงข้อมูลผู้ใช้สำเร็จ', user);
        } catch (error) {
            console.error('Get profile error:', error);
            return sendResponse(res, false, 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
        }
    }

    /**
     * เปลี่ยนรหัสผ่าน
     */
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return sendResponse(res, false, 'ข้อมูลไม่ถูกต้อง', { errors: errors.array() });
            }
            const { oldPassword, newPassword } = req.body;
            const user_id = req.user.user_id;
            const result = await AuthService.changePassword({ user_id, oldPassword, newPassword });
            return sendResponse(res, true, 'เปลี่ยนรหัสผ่านสำเร็จ', result);
        } catch (error) {
            console.error('Change password error:', error);
            return sendResponse(res, false, error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
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
                return sendResponse(res, false, 'ไม่พบ token');
            }
            const result = await AuthService.verifyToken(token);
            return sendResponse(res, true, 'ตรวจสอบ token สำเร็จ', result);
        } catch (error) {
            console.error('Verify token error:', error);
            return sendResponse(res, false, error.message || 'Token ไม่ถูกต้อง');
        }
    }
}

module.exports = AuthController;