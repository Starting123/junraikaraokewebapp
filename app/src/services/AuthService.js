const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const config = require('../config');

class AuthService {
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   */
  static async register({ name, email, password, role_id = 3 }) {
    try {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('อีเมลนี้ได้ถูกใช้งานแล้ว');
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const { insertId } = await User.create({
        name,
        email,
        passwordHash,
        role_id,
      });

      const createdUser = await User.findById(insertId);
      const payload = {
        user_id: insertId,
        name,
        email,
        role_id,
      };

      const token = this.generateToken(payload);

      return {
        success: true,
        message: 'ลงทะเบียนสำเร็จ',
        token,
        user: this.sanitizeUser(createdUser ?? payload),
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
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      const storedPassword = user.password || '';
      let isValidPassword = false;

      if (this.isBcryptHash(storedPassword)) {
        isValidPassword = await bcrypt.compare(password, storedPassword);
      } else {
        isValidPassword = storedPassword === password;

        if (isValidPassword) {
          // auto-upgrade legacy plain-text passwords
          try {
            const upgradedHash = await bcrypt.hash(password, 12);
            await User.updatePassword(user.user_id, upgradedHash);
          } catch (upgradeError) {
            console.warn('Failed to upgrade legacy password for user:', user.user_id, upgradeError);
          }
        }
      }
      if (!isValidPassword) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      if (!this.isUserActive(user)) {
        throw new Error('บัญชีของคุณถูกระงับ โปรดติดต่อผู้ดูแลระบบ');
      }

      const payload = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      };

      const token = this.generateToken(payload);

      return {
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        token,
        user: this.sanitizeUser(user),
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
      const decoded = jwt.verify(oldToken, config.jwt.secret);
      const user = await User.findById(decoded.user_id);

      if (!user || !this.isUserActive(user)) {
        throw new Error('ผู้ใช้ไม่ถูกต้องหรือถูกระงับ');
      }

      const payload = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      };

      const newToken = this.generateToken(payload);

      return {
        success: true,
        token: newToken,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error('ไม่สามารถรีเฟรช token ได้');
    }
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  static async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await User.findById(user_id);
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidOldPassword) {
        throw new Error('รหัสผ่านเก่าไม่ถูกต้อง');
      }

      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      await User.updatePassword(user.user_id, newPasswordHash);

      return {
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบ token
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.user_id);

      if (!user || !this.isUserActive(user)) {
        throw new Error('ผู้ใช้ไม่ถูกต้องหรือถูกระงับ');
      }

      return {
        success: true,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      console.error('Verify token error:', error);
      throw new Error('Token ไม่ถูกต้อง');
    }
  }

  /**
   * ขอรีเซ็ตรหัสผ่าน
   */
  static async requestPasswordReset(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('ไม่พบผู้ใช้งานนี้');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await User.setResetToken(user.user_id, token, expires);

    return {
      user: this.sanitizeUser(user),
      token,
      expires,
    };
  }

  /**
   * รีเซ็ตรหัสผ่านด้วย token
   */
  static async resetPassword(token, password) {
    const user = await User.findByResetToken(token);
    if (!user) {
      throw new Error('ลิงก์หมดอายุหรือไม่ถูกต้อง');
    }

    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
      throw new Error('ลิงก์หมดอายุหรือไม่ถูกต้อง');
    }

    const hash = await bcrypt.hash(password, 12);
    await User.updatePassword(user.user_id, hash);
    await User.clearResetToken(user.user_id);

    return this.sanitizeUser(user);
  }

  /**
   * สร้าง JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Utilities
   */
  static sanitizeUser(user) {
    if (!user) {
      return null;
    }

    if (typeof user.toJSON === 'function') {
      return user.toJSON();
    }

    const { password, reset_token, reset_expires, ...rest } = user;
    return rest;
  }

  static isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
  }

  static isUserActive(user) {
    if (!user) {
      return false;
    }

    const status = user.status;
    if (status === undefined || status === null) {
      return true;
    }

    const activeValues = new Set(['active', 'ACTIVE', 1, '1', true]);
    return activeValues.has(status);
  }

  static isAdmin(user) {
    return Boolean(user && (user.role_id === 1 || user.role === 'admin'));
  }

  static canAccessResource(currentUser, resourceUserId) {
    if (!currentUser) {
      return false;
    }

    return this.isAdmin(currentUser) || currentUser.user_id === resourceUserId;
  }
}

module.exports = AuthService;
