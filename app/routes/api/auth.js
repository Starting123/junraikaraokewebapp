const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const userModel = require('../../models/users');
const emailService = require('../../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// Login attempt logging function
async function logLoginAttempt(email, success, req, userId = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    
    await db.query(
      'INSERT INTO login_logs (user_id, email, login_time, ip_address, user_agent, success) VALUES (?,?,NOW(),?,?,?)',
      [userId, email, ip, userAgent, success ? 1 : 0]
    );
    
    console.log(`🔐 Login attempt logged: ${email} - ${success ? 'SUCCESS' : 'FAILED'} from ${ip}`);
  } catch (error) {
    console.error('❌ Failed to log login attempt:', error);
  }
}

// Rate limiting for login attempts to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for forgot password to prevent spam
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for reset password attempts
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase letter, lowercase letter, number, and special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'email already in use' });
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, hashed, 3]);
    res.status(201).json({ user_id: result.insertId, name, email });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', [
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await logLoginAttempt(email, false, req);
      return res.status(400).json({ errors: errors.array() });
    }
    
    const [rows] = await db.query('SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);
    
    if (rows.length === 0) {
      await logLoginAttempt(email, false, req);
      return res.status(401).json({ error: 'invalid credentials' });
    }
    
    const user = rows[0];
    
    // Check if user account is active
    if (user.status !== 'active') {
      await logLoginAttempt(email, false, req, user.user_id);
      return res.status(401).json({ error: 'account is inactive' });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    
    if (!ok) {
      await logLoginAttempt(email, false, req, user.user_id);
      return res.status(401).json({ error: 'invalid credentials' });
    }
    
    // Successful login
    await logLoginAttempt(email, true, req, user.user_id);
    
    const payload = { user_id: user.user_id, email: user.email, role_id: user.role_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '24h' });
    
    res.json({ 
      token, 
      user: { 
        user_id: user.user_id, 
        name: user.name, 
        email: user.email, 
        role_id: user.role_id 
      } 
    });
    
  } catch (err) {
    // Log failed attempt due to server error
    await logLoginAttempt(email, false, req);
    next(err);
  }
});

// GET /api/auth/me - returns user info and admin flag
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    // determine is_admin by role_id --- assume role_id 1 == admin
    const isAdmin = user.role_id === 1;
    res.json({ user, isAdmin });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', [
  forgotPasswordLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email } = req.body;
    console.log(`🔐 Password reset requested for: ${email}`);

    // Always return success message (don't reveal if email exists)
    const successResponse = {
      success: true,
      message: 'หากอีเมลของคุณอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านใน 5 นาที'
    };

    // Check if user exists
    const user = await userModel.findByEmail(email);
    if (!user) {
      // Don't reveal that email doesn't exist, but log it
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return res.json(successResponse);
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log(`⚠️ Password reset requested for inactive user: ${email}`);
      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = await userModel.createPasswordResetToken(email);
    if (!resetToken) {
      console.error(`❌ Failed to create reset token for: ${email}`);
      return res.json(successResponse);
    }

    // Send reset email
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const emailSent = await emailService.sendPasswordResetEmail(
      email, 
      user.name, 
      resetToken, 
      baseUrl
    );

    if (!emailSent) {
      console.error(`❌ Failed to send reset email to: ${email}`);
      // Clear the token if email failed
      await userModel.clearResetToken(email);
    } else {
      console.log(`✅ Password reset email sent to: ${email}`);
    }

    // Always return success message
    res.json(successResponse);

  } catch (err) {
    console.error('Error in forgot-password route:', err);
    next(err);
  }
});

// GET /api/auth/validate-reset-token/:token - Validate reset token
router.get('/validate-reset-token/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token || token.length !== 64) { // Our tokens are 32 bytes = 64 hex chars
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid token format' 
      });
    }

    const user = await userModel.validateResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        valid: false, 
        error: 'โทเคนไม่ถูกต้องหรือหมดอายุแล้ว' 
      });
    }

    res.json({ 
      valid: true, 
      user: { 
        name: user.name, 
        email: user.email 
      } 
    });

  } catch (err) {
    console.error('Error validating reset token:', err);
    next(err);
  }
});

// POST /api/auth/reset-password/:token - Reset password with token
router.post('/reset-password/:token', [
  resetPasswordLimiter,
  body('password')
    .isLength({ min: 6 })
    .withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('รหัสผ่านไม่ตรงกัน');
    }
    return true;
  })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    if (!token || token.length !== 64) {
      return res.status(400).json({ 
        error: 'Invalid token format' 
      });
    }

    console.log(`🔐 Attempting password reset with token: ${token.substring(0, 8)}...`);

    // Validate token and update password
    const success = await userModel.updatePasswordWithToken(token, password);
    
    if (!success) {
      console.log(`❌ Password reset failed - invalid/expired token: ${token.substring(0, 8)}...`);
      return res.status(400).json({ 
        error: 'โทเคนไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่' 
      });
    }

    console.log(`✅ Password reset successful for token: ${token.substring(0, 8)}...`);

    res.json({
      success: true,
      message: 'รหัสผ่านของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'
    });

  } catch (err) {
    console.error('Error in reset-password route:', err);
    next(err);
  }
});

module.exports = router;
