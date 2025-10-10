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

// Get single room by id
router.get('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const room = await roomsModel.getById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) { next(err); }
});

// Login logs viewer
router.get('/login-logs', adminOnly, async (req, res, next) => {
  try {
    const q = 'SELECT l.log_id, l.user_id, u.email, l.login_time, l.ip_address, l.user_agent, l.success FROM login_logs l LEFT JOIN users u ON l.user_id = u.user_id ORDER BY l.login_time DESC LIMIT 1000';
    const [rows] = await require('../../db').query(q);
    res.json({ logs: rows });
  } catch (err) { next(err); }
});

router.get('/login-logs/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT l.*, u.email FROM login_logs l LEFT JOIN users u ON l.user_id = u.user_id WHERE l.log_id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'log not found' });
    res.json({ log: rows[0] });
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

// Admin Bookings endpoint
router.get('/bookings', adminOnly, async (req, res, next) => {
  try {
    const db = require('../../db');
    const [rows] = await db.query(`
      SELECT 
        b.booking_id,
        DATE(b.start_time) as booking_date,
        TIME(b.start_time) as start_time,
        TIME(b.end_time) as end_time,
        b.status,
        b.total_price as total_amount,
        b.created_at,
        u.name as user_name,
        u.email as user_email,
        r.name as room_name,
        r.room_id,
        b.duration_hours as duration
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.created_at DESC
      LIMIT 500
    `);
    res.json({ bookings: rows });
  } catch (err) { 
    next(err); 
  }
});

// Admin Statistics endpoint
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const db = require('../../db');
    
    // Get total users
    const [usersCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersCount[0].count;
    
    // Get new users today
    const [newUsersToday] = await db.query('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()');
    const usersChange = newUsersToday[0].count;
    
    // Get total rooms
    const [roomsCount] = await db.query('SELECT COUNT(*) as count FROM rooms');
    const totalRooms = roomsCount[0].count;
    
    // Get available rooms
    const [availableRooms] = await db.query('SELECT COUNT(*) as count FROM rooms WHERE status = "available"');
    const roomsAvailable = availableRooms[0].count;
    
  // Get bookings today (use start_time since bookings table stores start_time/end_time)
  const [bookingsToday] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE DATE(start_time) = CURDATE()');
    const totalBookings = bookingsToday[0].count;
    
    // Get new bookings today
    const [newBookingsToday] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = CURDATE()');
    const bookingsChange = newBookingsToday[0].count;
    
    // Get revenue today (from completed bookings) - use start_time for booking date
    const [revenueToday] = await db.query(`
      SELECT COALESCE(SUM(total_price), 0) as revenue 
      FROM bookings 
      WHERE DATE(start_time) = CURDATE() 
      AND status IN ('completed', 'confirmed')
    `);
    const totalRevenue = revenueToday[0].revenue;
    
    // Get revenue change (today vs yesterday)
    const [revenueYesterday] = await db.query(`
      SELECT COALESCE(SUM(total_price), 0) as revenue 
      FROM bookings 
      WHERE DATE(start_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
      AND status IN ('completed', 'confirmed')
    `);
    const revenueChange = totalRevenue - revenueYesterday[0].revenue;
    
    res.json({
      totalUsers,
      usersChange,
      totalRooms,
      roomsAvailable,
      totalBookings,
      bookingsChange,
      totalRevenue,
      revenueChange
    });
    
  } catch (err) { 
    next(err); 
  }
});

// Get single booking details
router.get('/bookings/:id', adminOnly, [
  param('id').isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const bookingId = req.params.id;
    const db = require('../../db');
    
    const [rows] = await db.query(`
      SELECT 
        b.booking_id,
        b.user_id,
        b.room_id,
        DATE(b.start_time) as booking_date,
        TIME(b.start_time) as start_time,
        TIME(b.end_time) as end_time,
        b.status,
        b.total_price as total_amount,
        b.payment_status,
        b.duration_hours as duration,
        b.created_at,
        b.admin_notes,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        r.name as room_name,
        r.price_per_hour as price_per_hour
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      WHERE b.booking_id = ?
    `, [bookingId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(rows[0]);
    
  } catch (err) {
    console.error('Error fetching booking:', err);
    next(err);
  }
});

// Update booking status
router.put('/bookings/:id/status', adminOnly, [
  param('id').isInt({ gt: 0 }),
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed']),
  body('admin_notes').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const bookingId = req.params.id;
    const { status, admin_notes } = req.body;
    const db = require('../../db');
    
    // Check if booking exists
    const [bookingRows] = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update booking status and optionally admin notes
    if (admin_notes && admin_notes.trim()) {
      await db.query(
        'UPDATE bookings SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
        [status, admin_notes, bookingId]
      );
    } else {
      await db.query(
        'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
        [status, bookingId]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Booking status updated successfully',
      booking_id: bookingId,
      new_status: status
    });
    
  } catch (err) {
    console.error('Error updating booking status:', err);
    next(err);
  }
});

// Delete booking
router.delete('/bookings/:id', adminOnly, [
  param('id').isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const bookingId = req.params.id;
    const db = require('../../db');
    
    // Check if booking exists
    const [bookingRows] = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Delete related payments first
    await db.query('DELETE FROM booking_payments WHERE booking_id = ?', [bookingId]);
    
    // Delete booking
    await db.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    
    res.json({ 
      success: true, 
      message: 'Booking deleted successfully',
      booking_id: bookingId
    });
    
  } catch (err) {
    console.error('Error deleting booking:', err);
    next(err);
  }
});

module.exports = router;
