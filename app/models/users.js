const db = require('../db');
const bcrypt = require('bcryptjs');

async function findById(user_id) {
  const [rows] = await db.query('SELECT user_id, name, email, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function findByEmail(email) {
  const [rows] = await db.query('SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length ? rows[0] : null;
}

async function create({ name, email, password, role_id = 3 }) {
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, passwordHash, role_id]);
  return { insertId: result.insertId };
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  findById,
  findByEmail,
  create,
  verifyPassword
};
