const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config');

class AuthService {
    
    /**
     * ขอรีเซ็ตรหัสผ่าน - สร้างและส่ง OTP 6 หลัก
     */
    static async requestPasswordReset(email) {
        const user = await User.findByEmail(email);
        if (!user) throw new Error('ไม่พบผู้ใช้งานนี้');
        
        // สร้าง OTP 6 หลัก
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // กำหนดเวลาหมดอายุ 15 นาที
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        
        // บันทึก OTP ลงฐานข้อมูล
        await User.setResetOTP(user.user_id, otp, expires);
        
        return { user, otp };
    }

    /**
     * ยืนยัน OTP
     */
    static async verifyResetOTP(otp) {
        const user = await User.findByResetOTP(otp);
        
        if (!user) {
            throw new Error('รหัส OTP ไม่ถูกต้อง');
        }
        
        if (!user.reset_otp_expires) {
            throw new Error('รหัส OTP ไม่มีเวลาหมดอายุ กรุณาขอรหัสใหม่');
        }
        
        // แปลงเป็น timestamp เพื่อเปรียบเทียบที่แม่นยำ
        const expiresTimestamp = new Date(user.reset_otp_expires).getTime();
        const nowTimestamp = Date.now();
        
        if (expiresTimestamp < nowTimestamp) {
            throw new Error('รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่');
        }
        
        return { valid: true, user };
    }

    /**
     * รีเซ็ตรหัสผ่านด้วย OTP
     */
    static async resetPasswordWithOTP(otp, newPassword) {
        // ยืนยัน OTP ก่อน
        const { user } = await this.verifyResetOTP(otp);
        
        // Hash รหัสผ่านใหม่
        const hash = await bcrypt.hash(newPassword, 12);
        
        // อัพเดทรหัสผ่าน
        await User.updatePassword(user.user_id, hash);
        
        // ล้าง OTP
        await User.clearResetOTP(user.user_id);
        
        return user;
    }
    
    /**
     * รีเซ็ตรหัสผ่านด้วย token (legacy - for backward compatibility)
     */
    static async resetPassword(token, password) {
        const user = await User.findByResetToken(token);
        if (!user || !user.reset_otp_expires || new Date(user.reset_otp_expires) < new Date()) {
            throw new Error('ลิงก์หมดอายุหรือไม่ถูกต้อง');
        }
        const hash = await bcrypt.hash(password, 12);
        await User.updatePassword(user.user_id, hash);
        await User.clearResetToken(user.user_id);
        return user;
    }
    
    /**
     * ลงทะเบียนผู้ใช้ใหม่
     */
    static async register({ name, email, password, role_id = 3 }) {
        try {
            // ตรวจสอบว่า email ซ้ำหรือไม่
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                throw new Error('อีเมลนี้ได้ถูกใช้งานแล้ว');
            }

            // Hash รหัสผ่าน
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // สร้างผู้ใช้ใหม่
            const result = await User.create({
                name,
                email,
                passwordHash,
                role_id
            });

            // สร้าง JWT token
            const token = this.generateToken({
                user_id: result.insertId,
                name,
                email,
                role_id
            });

            return {
                success: true,
                message: 'ลงทะเบียนสำเร็จ',
                token,
                user: {
                    user_id: result.insertId,
                    name,
                    email,
                    role_id
                }
            };

        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * เข้าสู่ระบบ
     */
    static async login({ email, password }) {
        try {
            // ค้นหาผู้ใช้
            const user = await User.findByEmail(email);
            if (!user) {
                throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            }

            // ตรวจสอบรหัสผ่าน
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            }

            // ตรวจสอบสถานะผู้ใช้
            if (user.status !== 'active') {
                throw new Error('บัญชีของคุณถูกระงับ โปรดติดต่อผู้ดูแลระบบ');
            }

            // สร้าง JWT token
            const token = this.generateToken({
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role_id: user.role_id
            });

            return {
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ',
                token,
                user: user.toJSON()
            };

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * รีเฟรช token
     */
    static async refreshToken(oldToken) {
        try {
            // ตรวจสอบ token เก่า
            const decoded = jwt.verify(oldToken, config.jwt.secret);
            
            // ดึงข้อมูลผู้ใช้ปัจจุบัน
            const user = await User.findById(decoded.user_id);
            if (!user || user.status !== 'active') {
                throw new Error('ผู้ใช้ไม่ถูกต้องหรือถูกระงับ');
            }

            // สร้าง token ใหม่
            const newToken = this.generateToken({
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role_id: user.role_id
            });

            return {
                success: true,
                token: newToken,
                user: user.toJSON()
            };

        } catch (error) {
            throw new Error('ไม่สามารถรีเฟรช token ได้');
        }
    }

    /**
     * เปลี่ยนรหัสผ่าน
     */
    static async changePassword({ user_id, oldPassword, newPassword }) {
        try {
            // ดึงข้อมูลผู้ใช้
            const user = await User.findByEmail(user_id);
            if (!user) {
                throw new Error('ไม่พบผู้ใช้');
            }

            // ตรวจสอบรหัสผ่านเก่า
            const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
            if (!isValidOldPassword) {
                throw new Error('รหัสผ่านเก่าไม่ถูกต้อง');
            }

            // Hash รหัสผ่านใหม่
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // อัพเดทรหัสผ่าน
            await User.update(user_id, { password: newPasswordHash });

            return {
                success: true,
                message: 'เปลี่ยนรหัสผ่านสำเร็จ'
            };

        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    /**
     * ตรวจสอบสิทธิ์
     */
    static async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            const user = await User.findById(decoded.user_id);
            
            if (!user || user.status !== 'active') {
                throw new Error('ผู้ใช้ไม่ถูกต้องหรือถูกระงับ');
            }

            return {
                success: true,
                user: user.toJSON()
            };

        } catch (error) {
            throw new Error('Token ไม่ถูกต้อง');
        }
    }

    /**
     * สร้าง JWT token
     */
    static generateToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });
    }

    /**
     * ตรวจสอบว่าเป็น admin หรือไม่
     */
    static isAdmin(user) {
        return user.role_id === 1 || user.role === 'admin';
    }

    /**
     * ตรวจสอบว่าเป็นเจ้าของ resource หรือ admin
     */
    static canAccessResource(currentUser, resourceUserId) {
        return this.isAdmin(currentUser) || currentUser.user_id === resourceUserId;
    }
}

module.exports = AuthService;