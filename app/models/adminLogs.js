const db = require('../db');

async function logAdminAction({
  admin_id,
  action,
  target_type,
  target_id = null,
  ip_address = null,
  user_agent = null,
  details = null
}) {
  const [result] = await db.query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, ip_address, user_agent, details, timestamp) VALUES (?,?,?,?,?,?,?, NOW())',
    [admin_id, action, target_type, target_id, ip_address, user_agent, JSON.stringify(details)]
  );
  return { insertId: result.insertId };
}

async function getAdminLogs({ admin_id = null, action = null, target_type = null, limit = 100 } = {}) {
  const params = [];
  let sql = `
    SELECT al.*, u.name as admin_name, u.email as admin_email
    FROM admin_logs al 
    LEFT JOIN users u ON al.admin_id = u.user_id
  `;
  const where = [];
  
  if (admin_id) { where.push('al.admin_id = ?'); params.push(admin_id); }
  if (action) { where.push('al.action = ?'); params.push(action); }
  if (target_type) { where.push('al.target_type = ?'); params.push(target_type); }
  
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY al.timestamp DESC LIMIT ?';
  params.push(limit);
  
  const [rows] = await db.query(sql, params);
  return rows;
}

module.exports = {
  logAdminAction,
  getAdminLogs
};