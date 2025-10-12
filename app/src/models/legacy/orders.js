const db = require('../../utils/LegacyDb');

async function createOrder({ user_id, booking_id = null, items = [] }) {
  // items: [{ menu_id, quantity, special_request }]
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO orders (booking_id, status, total_price) VALUES (?,?,?)', [booking_id, 'pending', 0.00]);
    const orderId = r.insertId;
    let total = 0.00;
    for (const it of items) {
      const [menuRows] = await conn.query('SELECT price FROM menu WHERE menu_id = ? LIMIT 1', [it.menu_id]);
      if (menuRows.length === 0) throw new Error('menu item not found: ' + it.menu_id);
      const price = parseFloat(menuRows[0].price || 0);
      const qty = parseInt(it.quantity || 1, 10);
      total += price * qty;
      await conn.query('INSERT INTO order_items (order_id, menu_id, quantity, special_request) VALUES (?,?,?,?)', [orderId, it.menu_id, qty, it.special_request || null]);
    }
    await conn.query('UPDATE orders SET total_price = ? WHERE order_id = ?', [total.toFixed(2), orderId]);
    await conn.commit();
    return { order_id: orderId, total_price: total.toFixed(2) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getById(order_id) {
  const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [order_id]);
  if (!rows.length) return null;
  const order = rows[0];
  const [items] = await db.query('SELECT oi.*, m.name as menu_name, m.price FROM order_items oi JOIN menu m ON oi.menu_id = m.menu_id WHERE oi.order_id = ?', [order_id]);
  order.items = items;
  return order;
}

async function list({ user_id, booking_id, status, limit = 200 } = {}) {
  const params = [];
  let sql = 'SELECT o.* FROM orders o';
  const where = [];
  if (booking_id) { where.push('o.booking_id = ?'); params.push(booking_id); }
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY o.created_at DESC LIMIT ?'; params.push(limit);
  const [rows] = await db.query(sql, params);
  return rows;
}

async function updateStatus(order_id, status) {
  await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, order_id]);
  return true;
}

module.exports = { createOrder, getById, list, updateStatus };
