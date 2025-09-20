const db = require('../db');

async function list({ q, type_id, status, limit = 100 } = {}) {
  const params = [];
  let sql = `SELECT r.*, rt.type_name FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id`;
  const where = [];
  if (q) {
    where.push('(r.name LIKE ? OR rt.type_name LIKE ?)');
    params.push('%' + q + '%', '%' + q + '%');
  }
  if (type_id) {
    where.push('r.type_id = ?');
    params.push(type_id);
  }
  if (status) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.room_id DESC LIMIT ?';
  params.push(limit);
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getById(room_id) {
  const [rows] = await db.query('SELECT r.*, rt.type_name FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ? LIMIT 1', [room_id]);
  return rows.length ? rows[0] : null;
}

async function create({ name, type_id, capacity = 1, status = 'available' }) {
  const [result] = await db.query('INSERT INTO rooms (name, type_id, capacity, status) VALUES (?,?,?,?)', [name, type_id, capacity, status]);
  return { insertId: result.insertId };
}

async function update(room_id, fields = {}) {
  const sets = [];
  const params = [];
  for (const k of ['name','type_id','capacity','status']) {
    if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); }
  }
  if (!sets.length) return null;
  params.push(room_id);
  await db.query(`UPDATE rooms SET ${sets.join(', ')} WHERE room_id = ?`, params);
  return getById(room_id);
}

module.exports = { list, getById, create, update };
