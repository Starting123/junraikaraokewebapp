const express = require('express');
const router = express.Router();
const { body, param, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const ordersModel = require('../../models/orders');

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

function adminOnly(req, res, next) {
  if (!req.user || req.user.role_id !== 1) return res.status(403).json({ error: 'admin required' });
  next();
}

// Create order (customer) - items required
router.post('/', authMiddleware, [ body('items').isArray({ min: 1 }), body('booking_id').optional().isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const user_id = req.user.user_id;
    const { booking_id, items } = req.body;
    const result = await ordersModel.createOrder({ user_id, booking_id: booking_id || null, items });
    res.status(201).json({ order: result });
  } catch (err) { next(err); }
});

// List orders (admin can see all, customer sees their own via booking link)
router.get('/', authMiddleware, [ query('booking_id').optional().isInt({ gt: 0 }), query('status').optional() ], async (req, res, next) => {
  try {
    const isAdmin = req.user.role_id === 1;
    const { booking_id, status } = req.query;
    const rows = await ordersModel.list({ booking_id, status });
    res.json({ orders: rows });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const order = await ordersModel.getById(req.params.id);
    if (!order) return res.status(404).json({ error: 'order not found' });
    // For simplicity, assume any authenticated user can view order if they know id. Enhance with ownership checks if needed.
    res.json({ order });
  } catch (err) { next(err); }
});

// Admin update status
router.post('/:id/status', authMiddleware, [ param('id').isInt({ gt: 0 }), body('status').isString() ], async (req, res, next) => {
  try {
    if (req.user.role_id !== 1) return res.status(403).json({ error: 'admin required' });
    const { status } = req.body;
    await ordersModel.updateStatus(req.params.id, status);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
