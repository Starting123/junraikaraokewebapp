const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ApiResponse = require('../../middleware/apiResponse');

// Enforce JWT_SECRET environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
}
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res, next, options) => {
    console.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: { 
    error: 'Too many registration attempts. Please try again later.',
    retryAfter: 60 * 60 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
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
router.post('/register', registerLimiter, [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&)')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { firstname, lastname, name, email, phone, password } = req.body;
    
    // Check if user already exists
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    
    // Hash password
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Handle name fields (support both formats)
    const actualFirstname = firstname || (name ? name.split(' ')[0] : '');
    const actualLastname = lastname || (name ? name.split(' ').slice(1).join(' ') : '');
    const fullName = name || `${firstname || ''} ${lastname || ''}`.trim();
    
    // Create user with role_id 3 (customer)
    const [result] = await db.query(
      'INSERT INTO users (firstname, lastname, name, email, phone, password, role_id) VALUES (?,?,?,?,?,?,?)', 
      [actualFirstname, actualLastname, fullName, email, phone || null, hashed, 3]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { user_id: result.insertId, email, role_id: 3 },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );
    
    res.status(201).json({ 
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        user_id: result.insertId, 
        firstname: actualFirstname,
        lastname: actualLastname,
        name: fullName, 
        email,
        phone,
        role_id: 3
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// Session-based login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const [rows] = await db.query('SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = rows[0];

    // Check if account is active
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'บัญชีผู้ใช้ถูกปิดการใช้งาน' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Update last login
    await db.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

    // Regenerate session ID to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration failed:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Set session data
      req.session.user = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id
      };

      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save failed:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        // Generate JWT token for API access
        const token = jwt.sign(
          { 
            user_id: user.user_id, 
            email: user.email, 
            role_id: user.role_id 
          },
          JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES || '24h' }
        );

        res.json({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          user: req.session.user,
          token
        });
      });
    });
  } catch (err) {
    next(err);
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// Import middleware from auth.js instead of redefining
const { requireLogin } = require('../../middleware/auth');

// GET /api/auth/me - returns user info with admin flag (session-based)
router.get('/me', requireLogin, async (req, res, next) => {
  try {
    const user = req.session.user;
    // Determine is_admin by role_id (role_id 1 == admin)
    const isAdmin = user.role_id === 1;
    
    return ApiResponse.success(res, { 
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id
      },
      isAdmin 
    }, 'User profile retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/check-email - check if email is available
router.get('/check-email', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.json({ available: false });
    const [rows] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    res.json({ available: rows.length === 0 });
});

// Global error handler for auth routes
router.use((err, req, res, next) => {
  console.error('Auth API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  return ApiResponse.error(res, err, 500);
});

module.exports = router;
