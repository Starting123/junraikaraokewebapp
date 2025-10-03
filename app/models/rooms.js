const db = require('../db');

async function list({ q, type_id, status, limit = 100 } = {}) {
  const params = [];
  let sql = `SELECT r.*, rt.type_name, rt.price_per_hour FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id`;
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
  const [rows] = await db.query('SELECT r.*, rt.type_name, rt.price_per_hour FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ? LIMIT 1', [room_id]);
  return rows.length ? rows[0] : null;
}

// เพิ่มฟังก์ชันสำหรับอัปเดตสถานะห้องแบบ real-time
async function updateRoomStatus() {
  // เรียก stored procedure UpdateRoomStatus
  await db.query('CALL UpdateRoomStatus()');
  return true;
}

// ตรวจสอบห้องว่าง
async function getAvailableRooms(start_time, end_time) {
  const sql = `
    SELECT r.*, rt.type_name, rt.price_per_hour 
    FROM rooms r 
    LEFT JOIN room_types rt ON r.type_id = rt.type_id 
    WHERE r.room_id NOT IN (
      SELECT DISTINCT room_id 
      FROM bookings 
      WHERE status = 'active' 
      AND NOT (end_time <= ? OR start_time >= ?)
    )
    ORDER BY rt.price_per_hour ASC, r.name ASC
  `;
  const [rows] = await db.query(sql, [start_time, end_time]);
  return rows;
}

// ตรวจสอบความพร้อมของห้องพร้อมข้อมูลการจองที่ขัดแย้ง
async function checkRoomAvailability(room_id, start_time, end_time) {
  // ตรวจสอบการจองที่ขัดแย้ง
  const conflictSql = `
    SELECT b.*, u.name as user_name
    FROM bookings b 
    JOIN users u ON b.user_id = u.user_id
    WHERE b.room_id = ? AND b.status = 'active' 
    AND NOT (b.end_time <= ? OR b.start_time >= ?)
    ORDER BY b.start_time ASC
  `;
  const [conflicts] = await db.query(conflictSql, [room_id, start_time, end_time]);
  
  if (conflicts.length === 0) {
    return { available: true };
  }
  
  // หาเวลาถัดไปที่ห้องจะว่าง
  const nextAvailableSql = `
    SELECT MIN(end_time) as next_available 
    FROM bookings 
    WHERE room_id = ? AND status = 'active' 
    AND end_time > ?
  `;
  const [nextAvailable] = await db.query(nextAvailableSql, [room_id, new Date()]);
  
  return { 
    available: false, 
    conflicts,
    nextAvailable: nextAvailable[0]?.next_available,
    message: `ห้องนี้ถูกใช้งานอยู่ในเวลา ${new Date(conflicts[0].start_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}–${new Date(conflicts[0].end_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}`
  };
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

module.exports = { list, getById, create, update, updateRoomStatus, getAvailableRooms, checkRoomAvailability };
