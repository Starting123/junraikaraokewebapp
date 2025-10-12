const db = require('../db');

async function findById(user_id) {
  const [rows] = await db.query('SELECT user_id, firstname, lastname, name, email, phone, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function findByEmail(email) {
  const [rows] = await db.query('SELECT user_id, firstname, lastname, name, email, phone, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length ? rows[0] : null;
}

async function create({ firstname, lastname, name, email, phone, password, role_id = 3 }) {
  // Password should already be hashed by the controller
  // Support both old 'name' format and new 'firstname/lastname' format
  const actualFirstname = firstname || (name ? name.split(' ')[0] : '');
  const actualLastname = lastname || (name ? name.split(' ').slice(1).join(' ') : '');
  const fullName = name || `${firstname} ${lastname}`.trim();
  
  const [result] = await db.query(
    'INSERT INTO users (firstname, lastname, name, email, phone, password, role_id) VALUES (?,?,?,?,?,?,?)', 
    [actualFirstname, actualLastname, fullName, email, phone || null, password, role_id]
  );
  return result.insertId;
}

async function getById(user_id) {
  const [rows] = await db.query('SELECT user_id, firstname, lastname, name, email, phone, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function updateLastLogin(user_id) {
  await db.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user_id]);
}

async function updateProfile(user_id, { firstname, lastname, name, phone }) {
  const updates = [];
  const values = [];
  
  // Handle firstname/lastname updates
  if (firstname !== undefined) {
    updates.push('firstname = ?');
    values.push(firstname);
  }
  if (lastname !== undefined) {
    updates.push('lastname = ?');
    values.push(lastname);
  }
  // Update full name if firstname/lastname provided
  if (firstname !== undefined || lastname !== undefined) {
    const fullName = name || `${firstname || ''} ${lastname || ''}`.trim();
    updates.push('name = ?');
    values.push(fullName);
  }
  // Handle legacy name update
  if (name !== undefined && firstname === undefined && lastname === undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  
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
