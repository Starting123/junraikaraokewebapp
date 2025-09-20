const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

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
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'email already in use' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, hashed, 3]);
    res.status(201).json({ user_id: result.insertId, name, email });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', [ body('email').isEmail().normalizeEmail(), body('password').notEmpty() ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT user_id, name, email, password, role_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const payload = { user_id: user.user_id, email: user.email, role_id: user.role_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '2h' });
    res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email, role_id: user.role_id } });
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
    res.json({ user, isAdmin });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
