const express = require('express');
const router = express.Router();
const db = require('../../db');
const bookingsModel = require('../../models/bookings');
const roomsModel = require('../../models/rooms');
const { body, param, validationResult, query } = require('express-validator');
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

// Create a booking
router.post('/', authMiddleware, [
  body('room_id').isInt({ gt: 0 }),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { room_id, start_time, end_time, customer_id } = req.body;
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (!(start < end)) return res.status(400).json({ error: 'start_time must be before end_time' });

    // check room exists
    const room = await roomsModel.getById(room_id);
    if (!room) return res.status(404).json({ error: 'room not found' });

    // check for overlapping active bookings for the same room
    const overlap = await bookingsModel.hasOverlap(room_id, start_time, end_time);
    if (overlap) return res.status(409).json({ error: 'room not available for the requested time range' });

    // If customer_id is provided and requester is admin, allow creating on behalf of that customer
    let user_id = req.user.user_id;
    if (customer_id) {
      if (req.user.role_id !== 1) return res.status(403).json({ error: 'admin required to create booking for another user' });
      user_id = customer_id;
    }
    const booking = await bookingsModel.create({ user_id, room_id, start_time, end_time });
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

// List bookings (admins see all, users see their own)
router.get('/', authMiddleware, [
  query('room_id').optional().isInt({ gt: 0 }),
  query('status').optional().isIn(['active','cancelled','completed']),
  query('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { room_id, status, customer_id } = req.query;
    const isAdmin = req.user.role_id === 1;
    // If admin provided customer_id use that, otherwise non-admins always get their own bookings
    const listUserId = (isAdmin && customer_id) ? customer_id : req.user.user_id;
    const rows = await bookingsModel.list({ user_id: listUserId, room_id, status, isAdmin });
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// Get single booking by id
router.get('/:id', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
  const booking = await bookingsModel.findById(id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

// Cancel a booking (owner or admin)
router.post('/:id/cancel', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
  const booking = await bookingsModel.findById(id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'already cancelled' });
  await bookingsModel.cancel(id);
  res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
