const db = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function findById(user_id) {
  const [rows] = await db.query('SELECT user_id, name, email, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [user_id]);
  return rows.length ? rows[0] : null;
}

async function findByEmail(email) {
  const [rows] = await db.query('SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length ? rows[0] : null;
}

async function create({ name, email, passwordHash, role_id = 3 }) {
  const [result] = await db.query('INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', [name, email, passwordHash, role_id]);
  return { insertId: result.insertId };
}

// Password reset functions
async function createPasswordResetToken(email) {
  try {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    // Update user with reset token
    const [result] = await db.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?',
      [token, expiresAt, email]
    );
    
    if (result.affectedRows === 0) {
      return null; // Email not found
    }
    
    return token;
  } catch (error) {
    console.error('Error creating password reset token:', error);
    throw error;
  }
}

async function validateResetToken(token) {
  try {
    const [rows] = await db.query(
      `SELECT user_id, name, email, password_reset_expires 
       FROM users 
       WHERE password_reset_token = ? AND password_reset_expires > NOW() 
       LIMIT 1`,
      [token]
    );
    
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error('Error validating reset token:', error);
    throw error;
  }
}

async function updatePasswordWithToken(token, newPassword) {
  try {
    // First validate token
    const user = await validateResetToken(token);
    if (!user) {
      return false; // Invalid or expired token
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    const [result] = await db.query(
      `UPDATE users 
       SET password = ?, password_reset_token = NULL, password_reset_expires = NULL 
       WHERE password_reset_token = ?`,
      [hashedPassword, token]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating password with token:', error);
    throw error;
  }
}

async function clearResetToken(email) {
  try {
    await db.query(
      'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE email = ?',
      [email]
    );
  } catch (error) {
    console.error('Error clearing reset token:', error);
    throw error;
  }
}

module.exports = {
  findById,
  findByEmail,
  create,
  createPasswordResetToken,
  validateResetToken,
  updatePasswordWithToken,
  clearResetToken
};
