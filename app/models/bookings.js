const db = require('../db');

async function create({ user_id, room_id, start_time, end_time, duration_hours = 1 }) {
  // ดึงราคาห้อง
  const [roomData] = await db.query('SELECT rt.price_per_hour FROM rooms r JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ?', [room_id]);
  const pricePerHour = roomData.length ? roomData[0].price_per_hour : 0;
  const totalPrice = pricePerHour * duration_hours;
  
  const [result] = await db.query(
    'INSERT INTO bookings (user_id, room_id, start_time, end_time, status, total_price, duration_hours, payment_status) VALUES (?,?,?,?,?,?,?,?)', 
    [user_id, room_id, start_time, end_time, 'active', totalPrice, duration_hours, 'pending']
  );
  
  const [rows] = await db.query(
    'SELECT b.*, r.name as room_name, rt.type_name, rt.price_per_hour FROM bookings b JOIN rooms r ON b.room_id = r.room_id JOIN room_types rt ON r.type_id = rt.type_id WHERE b.booking_id = ? LIMIT 1', 
    [result.insertId]
  );
  return rows.length ? rows[0] : null;
}

async function findById(id) {
  const [rows] = await db.query(`
    SELECT b.*, u.name as user_name, r.name as room_name, r.capacity, 
           rt.type_name, rt.price_per_hour, r.status as room_status
    FROM bookings b 
    JOIN users u ON b.user_id = u.user_id 
    JOIN rooms r ON b.room_id = r.room_id 
    JOIN room_types rt ON r.type_id = rt.type_id 
    WHERE b.booking_id = ? LIMIT 1
  `, [id]);
  return rows.length ? rows[0] : null;
}

async function list({ user_id, room_id, status, payment_status, isAdmin, limit = 200 } = {}) {
  const params = [];
  let sql = `
    SELECT b.*, u.name as user_name, r.name as room_name, r.capacity,
           rt.type_name, rt.price_per_hour, r.status as room_status
    FROM bookings b 
    JOIN users u ON b.user_id = u.user_id 
    JOIN rooms r ON b.room_id = r.room_id 
    JOIN room_types rt ON r.type_id = rt.type_id
  `;
  const where = [];
  
  // apply user filter if provided; admins may pass a user_id to view that user's bookings
  if (user_id) {
    where.push('b.user_id = ?'); params.push(user_id);
  } else if (!isAdmin) {
    // non-admins with no explicit user_id should only see their own - caller should provide user_id
    return [];
  }
  if (room_id) { where.push('b.room_id = ?'); params.push(room_id); }
  if (status) { where.push('b.status = ?'); params.push(status); }
  if (payment_status) { where.push('b.payment_status = ?'); params.push(payment_status); }
  
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

// อัปเดตสถานะการชำระเงิน
async function updatePaymentStatus(booking_id, status) {
  await db.query('UPDATE bookings SET payment_status = ? WHERE booking_id = ?', [status, booking_id]);
  return true;
}

// สร้างการชำระเงิน
// NOTE: some environments don't have `proof_of_payment_path` column yet. To avoid SQL errors
// during runtime we insert into the existing columns and still return the proof_path so
// frontend can present it. Add a DB migration later to persist `proof_of_payment_path`.
async function createPayment({ booking_id, amount, method = 'cash', transaction_id = null, proof_path = null }) {
  try {
    console.log('Creating payment with data:', { booking_id, amount, method, transaction_id, proof_path });

    // Insert into columns that exist in current schema
    const [result] = await db.query(
      'INSERT INTO booking_payments (booking_id, amount, method, status, transaction_id, proof_of_payment_path, payment_date) VALUES (?,?,?,?,?,?,NOW())',
      [booking_id, amount, method, 'paid', transaction_id, proof_path]
    );

    console.log('Payment created with ID:', result.insertId);

    // อัปเดตสถานะการชำระเงินในตาราง bookings
    await updatePaymentStatus(booking_id, 'paid');

    // Return payment id and provided proof_path (note: proof_path not persisted until DB migration)
    return { payment_id: result.insertId, proof_path };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

// ดึงข้อมูลการชำระเงิน
async function getPayment(booking_id) {
  const [rows] = await db.query('SELECT * FROM booking_payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1', [booking_id]);
  return rows.length ? rows[0] : null;
}

// สถิติสำหรับผู้ใช้
async function getUserStats(user_id) {
  const [totalBookings] = await db.query('SELECT COUNT(*) as count, SUM(total_price) as total_spent FROM bookings WHERE user_id = ?', [user_id]);
  const [thisMonth] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())', [user_id]);
  const [activeBookings] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = "active"', [user_id]);
  
  return {
    totalBookings: totalBookings[0].count || 0,
    totalSpent: totalBookings[0].total_spent || 0,
    thisMonth: thisMonth[0].count || 0,
    activeBookings: activeBookings[0].count || 0
  };
}

module.exports = { 
  create, findById, list, hasOverlap, cancel, 
  updatePaymentStatus, createPayment, getPayment, getUserStats 
};
