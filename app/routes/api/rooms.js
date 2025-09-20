const express = require('express');
const router = express.Router();
const db = require('../../db');

// GET /api/rooms - list rooms
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT room_id, name, type_id, status, capacity FROM rooms');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT * FROM rooms WHERE room_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
