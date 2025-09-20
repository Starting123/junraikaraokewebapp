const express = require('express');
const router = express.Router();
const { body, param, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

const usersModel = require('../../models/users');
const roomsModel = require('../../models/rooms');

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

async function adminOnly(req, res, next) {
  await authMiddleware(req, res, async () => {
    if (!req.user || req.user.role_id !== 1) return res.status(403).json({ error: 'admin required' });
    next();
  });
}

// Users CRUD
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    // very small list for admin
    const [rows] = await require('../../db').query('SELECT user_id, name, email, role_id, status, created_at FROM users ORDER BY user_id DESC LIMIT 500');
    res.json({ users: rows });
  } catch (err) { next(err); }
});

router.get('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const user = await usersModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

router.put('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }), body('role_id').optional().isInt(), body('status').optional().isIn(['active','inactive']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
    const update = {};
    if (req.body.role_id !== undefined) update.role_id = req.body.role_id;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'nothing to update' });
    await require('../../db').query('UPDATE users SET ? WHERE user_id = ?', [update, id]);
    const user = await usersModel.findById(id);
    res.json({ user });
  } catch (err) { next(err); }
});

router.delete('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('DELETE FROM users WHERE user_id = ? LIMIT 1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Rooms CRUD (use roomsModel)
router.get('/rooms', adminOnly, async (req, res, next) => {
  try {
    const rows = await roomsModel.list({ limit: 1000 });
    res.json({ rooms: rows });
  } catch (err) { next(err); }
});

router.post('/rooms', adminOnly, [ body('name').notEmpty(), body('type_id').isInt({ gt: 0 }), body('capacity').optional().isInt({ gt: 0 }), body('status').optional().isIn(['available','occupied']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const created = await roomsModel.create({ name: req.body.name, type_id: req.body.type_id, capacity: req.body.capacity, status: req.body.status });
    const room = await roomsModel.getById(created.insertId);
    res.status(201).json({ room });
  } catch (err) { next(err); }
});

router.put('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const room = await roomsModel.update(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'room not found or nothing to update' });
    res.json({ room });
  } catch (err) { next(err); }
});

router.delete('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('DELETE FROM rooms WHERE room_id = ? LIMIT 1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
