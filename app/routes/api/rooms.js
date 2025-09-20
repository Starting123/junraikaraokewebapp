const express = require('express');
const router = express.Router();
const db = require('../../db');

// GET /api/rooms - list rooms
router.get('/roomForm', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT room_id, name, type_id, status, capacity FROM rooms');
    console.log('Retrieved rooms:', rows); // log retrieved rooms
    res.json(rows);
  } catch (err) {
    console.error('Error getting rooms:', err); // log error
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

// POST /api/rooms - create new room
router.post('/', async (req, res, next) => {
  try {
    console.log('Received room data:', req.body); // log received data
    const { name, type_id, status, capacity } = req.body;
    const [result] = await db.query(
      'INSERT INTO rooms (name, type_id, status, capacity) VALUES (?, ?, ?, ?)',
      [name, type_id, status, capacity]
    );
    console.log('Insert result:', result); // log insert result
    res.redirect('/roomForm');
  } catch (err) {
    console.error('Error creating room:', err); // log error
    next(err);
  }
});

module.exports = router;
