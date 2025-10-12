const express = require('express');
const router = express.Router();
const { body, param, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const ApiResponse = require('../../middleware/apiResponse');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

const usersModel = require('../../models/users');
const roomsModel = require('../../models/rooms');
const adminLogsModel = require('../../models/adminLogs');
const cacheService = require('../../services/cacheService');
const adminRoomsController = require('../../controllers/adminRoomsController');

// Helper function to get total rooms count for pagination
async function getTotalRoomsCount(params = {}) {
  const whereConditions = [];
  const queryParams = [];
  
  let sql = 'SELECT COUNT(*) as total FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id';
  
  if (params.q) {
    whereConditions.push('(r.name LIKE ? OR rt.type_name LIKE ?)');
    queryParams.push(`%${params.q}%`, `%${params.q}%`);
  }
  if (params.type_id) {
    whereConditions.push('r.type_id = ?');
    queryParams.push(params.type_id);
  }
  if (params.status) {
    whereConditions.push('r.status = ?');
    queryParams.push(params.status);
  }
  
  if (whereConditions.length) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }
  
  const [rows] = await require('../../db').query(sql, queryParams);
  return rows[0].total;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

async function adminOnly(req, res, next) {
  await authMiddleware(req, res, async () => {
    if (!req.user || req.user.role_id !== 1) return res.status(403).json({ error: 'admin required' });
    next();
  });
}

// Audit logging middleware for admin actions
function auditLog(action, target_type) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      // Log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const details = {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          body: req.body,
          query: req.query
        };
        
        // Log admin action
        adminLogsModel.logAdminAction({
          admin_id: req.user.user_id,
          action,
          target_type,
          target_id: req.params.id || null,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent'),
          details
        }).catch(err => console.error('Audit log error:', err));

        // Invalidate relevant caches
        if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
          cacheService.invalidateAdminCache(target_type + 's'); // pluralize
        }
      }
      return originalJson.call(this, data);
    };
    next();
  };
}

// Users CRUD
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    // very small list for admin
    const [rows] = await require('../../db').query('SELECT user_id, name, email, role_id, status, created_at FROM users ORDER BY user_id DESC LIMIT 500');
    res.json({ users: rows });
  } catch (err) { next(err); }
});

router.get('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const user = await usersModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

router.put('/users/:id', adminOnly, auditLog('UPDATE', 'user'), [ param('id').isInt({ gt: 0 }), body('role_id').optional().isInt(), body('status').optional().isIn(['active','inactive']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
    const updates = [];
    const params = [];
    if (req.body.role_id !== undefined) { updates.push('role_id = ?'); params.push(req.body.role_id); }
    if (req.body.status !== undefined) { updates.push('status = ?'); params.push(req.body.status); }
    if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });
    params.push(id);
    await require('../../db').query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);
    const user = await usersModel.findById(id);
    res.json({ user });
  } catch (err) { next(err); }
});

router.delete('/users/:id', adminOnly, auditLog('DELETE', 'user'), [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const [result] = await require('../../db').query('DELETE FROM users WHERE user_id = ? LIMIT 1', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'user not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) { next(err); }
});

// Rooms CRUD (use roomsModel)
router.get('/rooms', adminOnly, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('q').optional().isString().trim(),
  query('status').optional().isIn(['available', 'occupied', 'maintenance']),
  query('type_id').optional().isInt({ min: 1 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build query parameters
    const queryParams = {
      q: req.query.q,
      type_id: req.query.type_id,
      status: req.query.status,
      limit: limit + 1 // Get one extra to check if there are more pages
    };

    const rooms = await roomsModel.list(queryParams);
    const hasMore = rooms.length > limit;
    const roomsToReturn = hasMore ? rooms.slice(0, limit) : rooms;

    // Calculate pagination info
    const totalItems = await getTotalRoomsCount(queryParams);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      rooms: roomsToReturn,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: hasMore,
        hasPrev: page > 1
      }
    });
  } catch (err) { next(err); }
});

// Login logs viewer
router.get('/login-logs', adminOnly, async (req, res, next) => {
  try {
    const q = 'SELECT l.log_id, l.user_id, u.email, l.login_time, l.ip_address, l.user_agent, l.success FROM login_logs l LEFT JOIN users u ON l.user_id = u.user_id ORDER BY l.login_time DESC LIMIT 1000';
    const [rows] = await require('../../db').query(q);
    res.json({ logs: rows });
  } catch (err) { next(err); }
});

router.get('/login-logs/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT l.*, u.email FROM login_logs l LEFT JOIN users u ON l.user_id = u.user_id WHERE l.log_id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'log not found' });
    res.json({ log: rows[0] });
  } catch (err) { next(err); }
});

router.post('/rooms', adminOnly, auditLog('CREATE', 'room'), [ body('name').notEmpty(), body('type_id').isInt({ gt: 0 }), body('capacity').optional().isInt({ gt: 0 }), body('status').optional().isIn(['available','occupied']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const created = await roomsModel.create({ name: req.body.name, type_id: req.body.type_id, capacity: req.body.capacity, status: req.body.status });
    const room = await roomsModel.getById(created.insertId);
    res.status(201).json({ room });
  } catch (err) { next(err); }
});

router.put('/rooms/:id', adminOnly, auditLog('UPDATE', 'room'), [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const room = await roomsModel.update(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'room not found or nothing to update' });
    res.json({ room });
  } catch (err) { next(err); }
});

router.delete('/rooms/:id', adminOnly, auditLog('DELETE', 'room'), [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const [result] = await require('../../db').query('DELETE FROM rooms WHERE room_id = ? LIMIT 1', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'room not found' });
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err) { next(err); }
});

// Admin Bookings endpoint
router.get('/bookings', adminOnly, async (req, res, next) => {
  try {
    const db = require('../../db');
    const [rows] = await db.query(`
      SELECT 
        b.booking_id,
        DATE(b.start_time) as booking_date,
        TIME(b.start_time) as start_time,
        TIME(b.end_time) as end_time,
        b.status,
        b.total_price as total_amount,
        b.created_at,
        u.name as user_name,
        u.email as user_email,
        r.name as room_name,
        r.room_id,
        b.duration_hours as duration
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.created_at DESC
      LIMIT 500
    `);
    res.json({ bookings: rows });
  } catch (err) { 
    next(err); 
  }
});

// Admin Statistics endpoint with caching
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const stats = await cacheService.getAdminStats(async () => {
      const db = require('../../db');
      
      // Use parallel queries for better performance
      const queries = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'),
        db.query('SELECT COUNT(*) as count FROM rooms'),
        db.query('SELECT COUNT(*) as count FROM rooms WHERE status = "available"'),
        db.query('SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = CURDATE()'),
        db.query('SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = CURDATE()'),
        db.query(`
          SELECT COALESCE(SUM(total_price), 0) as revenue 
          FROM bookings 
          WHERE DATE(booking_date) = CURDATE() 
          AND status IN ('completed', 'confirmed')
        `),
        db.query(`
          SELECT COALESCE(SUM(total_price), 0) as revenue 
          FROM bookings 
          WHERE DATE(booking_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
          AND status IN ('completed', 'confirmed')
        `)
      ]);

      const [
        [usersCount], [newUsersToday], [roomsCount], [availableRooms],
        [bookingsToday], [newBookingsToday], [revenueToday], [revenueYesterday]
      ] = queries;

      const totalRevenue = revenueToday[0].revenue;
      const revenueChange = totalRevenue - revenueYesterday[0].revenue;

      return {
        totalUsers: usersCount[0].count,
        usersChange: newUsersToday[0].count,
        totalRooms: roomsCount[0].count,
        roomsAvailable: availableRooms[0].count,
        totalBookings: bookingsToday[0].count,
        bookingsChange: newBookingsToday[0].count,
        totalRevenue,
        revenueChange,
        cacheTimestamp: new Date().toISOString()
      };
    });
    
    res.json(stats);
    
  } catch (err) { 
    next(err); 
  }
});

// Get room details by ID
router.get('/rooms/:id', adminOnly, [param('id').isInt({ gt: 0 })], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const room = await roomsModel.getById(req.params.id);
    if (!room) return res.status(404).json({ error: 'room not found' });

    res.json({ room });
  } catch (err) { next(err); }
});

// Get audit logs
router.get('/logs', adminOnly, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('target_type').optional().isString()
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const queryParams = {
      action: req.query.action,
      target_type: req.query.target_type,
      limit: limit
    };

    const logs = await adminLogsModel.getAdminLogs(queryParams);
    
    res.json({
      logs,
      pagination: {
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (err) { next(err); }
});

// Global error handler for admin routes
router.use((err, req, res, next) => {
  console.error('Admin API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user
  });
  
  return ApiResponse.error(res, err, 500);
});

module.exports = router;
