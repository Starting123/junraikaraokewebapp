const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ApiResponse = require('../../middleware/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
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
  skipSuccessfulRequests: true // Don't count successful requests
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
  body('password').isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    
    // Hash password
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Create user with role_id 2 (customer)
    const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, hashed, 2]);
    
    // Generate JWT token
    const token = jwt.sign(
      { user_id: result.insertId, email, role_id: 2 },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );
    
    res.status(201).json({ 
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        user_id: result.insertId, 
        name, 
        email,
        role_id: 2
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
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
    
    const payload = { user_id: user.user_id, email: user.email, role_id: user.role_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '24h' });
    
    res.json({ 
      message: 'เข้าสู่ระบบสำเร็จ',
      token, 
      user: { 
        user_id: user.user_id, 
        name: user.name, 
        email: user.email, 
        role_id: user.role_id 
      } 
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - returns user info and admin flag
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    // determine is_admin by role_id --- assume role_id 1 == admin
    const isAdmin = user.role_id === 1;
    return ApiResponse.success(res, { user, isAdmin }, 'User profile retrieved successfully');
  } catch (err) {
    next(err);
  }
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
