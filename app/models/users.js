const db = require('../db');

async function findById(user_id) {
  const [rows] = await db.query('SELECT user_id, name, email, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function findByEmail(email) {
  const [rows] = await db.query('SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length ? rows[0] : null;
}

async function create({ name, email, password, role_id = 2 }) {
  // Password should already be hashed by the controller
  const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, password, role_id]);
  return result.insertId;
}

async function getById(user_id) {
  const [rows] = await db.query('SELECT user_id, name, email, role_id, status, phone, address, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function updateLastLogin(user_id) {
  await db.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user_id]);
}

async function updateProfile(user_id, { name, phone, address }) {
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    values.push(phone);
  }
  if (address !== undefined) {
    updates.push('address = ?');
    values.push(address);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(user_id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
    await db.query(query, values);
  }
}

async function updatePassword(user_id, hashedPassword) {
  await db.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [hashedPassword, user_id]);
}

async function storePasswordResetToken(user_id, token) {
  // Store reset token in users table
  await db.query('UPDATE users SET password_reset_token = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE user_id = ?', [token, user_id]);
}

async function clearPasswordResetToken(user_id) {
  await db.query('UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE user_id = ?', [user_id]);
}

module.exports = {
  findById,
  findByEmail,
  create,
  getById,
  updateLastLogin,
  updateProfile,
  updatePassword,
  storePasswordResetToken,
  clearPasswordResetToken
};
