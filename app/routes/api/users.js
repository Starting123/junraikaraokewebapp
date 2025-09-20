// Clean auth API: register, login, password reset (request + confirm)
const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const RESET_TOKEN_EXPIRY_HOURS = parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS || '1', 10);

async function sendResetEmail(toEmail, token) {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.log('[mail-debug] password reset token for', toEmail, token);
    return { info: 'no-smtp', token };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE === 'true'),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to: toEmail,
    subject: 'Password reset',
    text: `Use this token to reset your password: ${token}\nOr open: ${resetUrl}`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Or use token: <code>${token}</code></p>`
  };

  return transporter.sendMail(mailOptions);
}

// GET /api/users - list users (basic)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, role_id, status, created_at FROM users');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - register
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('name required'),
    body('email').isEmail().withMessage('valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('password min 6 chars'),
    body('role_id').optional().isInt()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role_id = 2 } = req.body;
      const [existing] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length > 0) return res.status(409).json({ error: 'email already in use' });

      const hashed = await bcrypt.hash(password, 10);
      const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, hashed, role_id]);
      res.status(201).json({ user_id: result.insertId, name, email });
    } catch (err) {
      next(err);
    }
  });

// POST /api/users/login
router.post('/login',
  [ body('email').isEmail().normalizeEmail(), body('password').notEmpty() ],
  async (req, res, next) => {
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

// POST /api/users/password-reset/request
router.post('/password-reset/request', [ body('email').isEmail().normalizeEmail() ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email } = req.body;
    const [urows] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (urows.length === 0) {
      return res.json({ ok: true });
    }
    const user = urows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 3600 * 1000);
    await db.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)', [user.user_id, token, expiresAt]);
    await sendResetEmail(email, token);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/password-reset/confirm
router.post('/password-reset/confirm', [ body('token').notEmpty(), body('password').isLength({ min: 6 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { token, password } = req.body;
    const [rows] = await db.query('SELECT reset_id, user_id, expires_at, used FROM password_resets WHERE token = ? LIMIT 1', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'invalid token' });
    const reset = rows[0];
    if (reset.used) return res.status(400).json({ error: 'token already used' });
    const now = new Date();
    if (new Date(reset.expires_at) < now) return res.status(400).json({ error: 'token expired' });
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, reset.user_id]);
    await db.query('UPDATE password_resets SET used = 1 WHERE reset_id = ?', [reset.reset_id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
