const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcryptjs');

// GET /api/users - list users (basic)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, role_id, status, created_at FROM users');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - create user (very basic, hashes password)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role_id = 2 } = req.body; // default role
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, hashed, role_id]);
    res.status(201).json({ user_id: result.insertId, name, email });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
