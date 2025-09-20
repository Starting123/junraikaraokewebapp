const db = require('../db');

async function create({ user_id, room_id, start_time, end_time }) {
  const [result] = await db.query('INSERT INTO bookings (user_id, room_id, start_time, end_time, status) VALUES (?,?,?,?,?)', [user_id, room_id, start_time, end_time, 'active']);
  const [rows] = await db.query('SELECT b.*, r.name as room_name FROM bookings b JOIN rooms r USING(room_id) WHERE b.booking_id = ? LIMIT 1', [result.insertId]);
  return rows.length ? rows[0] : null;
}

async function findById(id) {
  const [rows] = await db.query('SELECT b.*, u.name as user_name, r.name as room_name FROM bookings b JOIN users u ON b.user_id = u.user_id JOIN rooms r ON b.room_id = r.room_id WHERE b.booking_id = ? LIMIT 1', [id]);
  return rows.length ? rows[0] : null;
}

async function list({ user_id, room_id, status, isAdmin, limit = 200 } = {}) {
  const params = [];
  let sql = `SELECT b.*, u.name as user_name, r.name as room_name FROM bookings b JOIN users u ON b.user_id = u.user_id JOIN rooms r ON b.room_id = r.room_id`;
  const where = [];
  // apply user filter if provided; admins may pass a user_id to view that user's bookings
  if (user_id) {
    where.push('b.user_id = ?'); params.push(user_id);
  } else if (!isAdmin) {
    // non-admins with no explicit user_id should only see their own - caller should provide user_id
    // if caller didn't provide a user_id and is not admin, return empty
    return [];
  }
  if (room_id) { where.push('b.room_id = ?'); params.push(room_id); }
  if (status) { where.push('b.status = ?'); params.push(status); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY b.start_time DESC LIMIT ?'; params.push(limit);
  const [rows] = await db.query(sql, params);
  return rows;
}

async function hasOverlap(room_id, start_time, end_time) {
  const [rows] = await db.query(`SELECT COUNT(*) AS cnt FROM bookings WHERE room_id = ? AND status = 'active' AND NOT (end_time <= ? OR start_time >= ?)`, [room_id, start_time, end_time]);
  return rows[0].cnt > 0;
}

async function cancel(id) {
  await db.query('UPDATE bookings SET status = ? WHERE booking_id = ?', ['cancelled', id]);
  return true;
}

module.exports = { create, findById, list, hasOverlap, cancel };
