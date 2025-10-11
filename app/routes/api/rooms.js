const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db');

// helper for validation errors
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

// GET /api/rooms - list rooms
router.get('/roomForm', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.room_id, r.name, r.type_id, t.type_name, t.price_per_hour, r.status, r.capacity
       FROM rooms r
       LEFT JOIN room_types t ON r.type_id = t.type_id
       ORDER BY t.price_per_hour ASC, r.name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error getting rooms:', err); // log error
    next(err);
  }
});

// GET /api/rooms/available - ดึงห้องว่างในช่วงเวลาที่กำหนด (MUST come before /:id)
router.get('/available', [
  query('start_time').isISO8601().withMessage('start_time must be valid ISO date'),
  query('end_time').isISO8601().withMessage('end_time must be valid ISO date')
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    
    const { start_time, end_time } = req.query;
    const start = new Date(start_time);
    const end = new Date(end_time);
    
    if (!(start < end)) return res.status(400).json({ error: 'start_time must be before end_time' });
    
    const roomsModel = require('../../models/rooms');
    const availableRooms = await roomsModel.getAvailableRooms(start_time, end_time);
    
    res.json({ rooms: availableRooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id - Get specific room details (MUST come after /available)
router.get('/:id', [
  param('id').isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT r.room_id, r.name, r.type_id, t.type_name, t.price_per_hour, r.status, r.capacity
       FROM rooms r
       LEFT JOIN room_types t ON r.type_id = t.type_id
       WHERE r.room_id = ? LIMIT 1`, [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms/update-status - อัปเดตสถานะห้องทั้งหมด
router.post('/update-status', async (req, res, next) => {
  try {
    const roomsModel = require('../../models/rooms');
    await roomsModel.updateRoomStatus();
    res.json({ success: true, message: 'Room status updated' });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms - create room
router.post('/', [
  body('name').trim().notEmpty().withMessage('name required'),
  body('type_id').isInt({ gt: 0 }).withMessage('valid type_id required'),
  body('status').optional().isString(),
  body('capacity').optional().isInt({ gt: 0 }).withMessage('capacity must be positive int')
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const { name, type_id, status = 'available', capacity = null } = req.body;

    // ensure room type exists
    const [trows] = await db.query('SELECT type_id FROM room_types WHERE type_id = ? LIMIT 1', [type_id]);
    if (trows.length === 0) return res.status(400).json({ error: 'room type not found' });

    const [result] = await db.query(
      'INSERT INTO rooms (name, type_id, status, capacity) VALUES (?,?,?,?)',
      [name, type_id, status, capacity]
    );

    const insertId = result.insertId;
    const [newRows] = await db.query('SELECT room_id, name, type_id, status, capacity FROM rooms WHERE room_id = ? LIMIT 1', [insertId]);
    res.status(201).json(newRows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id - update room
router.put('/:id', [
  param('id').isInt({ gt: 0 }),
  body('name').optional().trim().notEmpty(),
  body('type_id').optional().isInt({ gt: 0 }),
  body('status').optional().isString(),
  body('capacity').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const id = parseInt(req.params.id, 10);

    // check exists
    const [exists] = await db.query('SELECT room_id FROM rooms WHERE room_id = ? LIMIT 1', [id]);
    if (exists.length === 0) return res.status(404).json({ error: 'not found' });

    const fields = [];
    const params = [];

    const { name, type_id, status, capacity } = req.body;
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (type_id !== undefined) {
      // validate type_id exists
      const [trows] = await db.query('SELECT type_id FROM room_types WHERE type_id = ? LIMIT 1', [type_id]);
      if (trows.length === 0) return res.status(400).json({ error: 'room type not found' });
      fields.push('type_id = ?'); params.push(type_id);
    }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity); }

    if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

    params.push(id);
    const sql = `UPDATE rooms SET ${fields.join(', ')} WHERE room_id = ?`;
    await db.query(sql, params);

    const [updated] = await db.query('SELECT room_id, name, type_id, status, capacity FROM rooms WHERE room_id = ? LIMIT 1', [id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/search?q=...&type_id=...&status=...
router.get('/search', [
  query('q').optional().trim(),
  query('type_id').optional().isInt({ gt: 0 }),
  query('status').optional().isString()
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const q = req.query.q ? `%${req.query.q}%` : null;
    const typeId = req.query.type_id ? parseInt(req.query.type_id, 10) : null;
    const status = req.query.status || null;

    const where = [];
    const params = [];

    if (q) {
      where.push('(r.name LIKE ? OR t.type_name LIKE ?)');
      params.push(q, q);
    }
    if (typeId) {
      where.push('r.type_id = ?');
      params.push(typeId);
    }
    if (status) {
      where.push('r.status = ?');
      params.push(status);
    }

    const sql = `
      SELECT r.room_id, r.name, r.type_id, t.type_name, r.status, r.capacity
      FROM rooms r
      LEFT JOIN room_types t ON r.type_id = t.type_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.room_id
      LIMIT 200
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/room-types - get all room types for admin forms
router.get('/types', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT type_id, type_name, price_per_hour, description FROM room_types ORDER BY price_per_hour ASC'
    );
    res.json({ roomTypes: rows });
  } catch (err) {
    console.error('Error getting room types:', err);
    next(err);
  }
});

module.exports = router;