const express = require('express');
const router = express.Router();
const { body, param, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

const usersModel = require('../../models/users');
const roomsModel = require('../../models/rooms');

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

// Create new user
router.post('/users', adminOnly, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role_id').isInt({ min: 1, max: 2 }).withMessage('Valid role is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, email, password, role_id } = req.body;
    
    // Check if email already exists
    const [existingUsers] = await require('../../db').query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create user using model
    const newUser = await usersModel.create({ name, email, password, role_id });
    res.status(201).json({ user: newUser, message: 'User created successfully' });
  } catch (err) { next(err); }
});

router.put('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }), body('role_id').optional().isInt(), body('status').optional().isIn(['active','inactive']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
    const update = {};
    if (req.body.role_id !== undefined) update.role_id = req.body.role_id;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'nothing to update' });
    await require('../../db').query('UPDATE users SET ? WHERE user_id = ?', [update, id]);
    const user = await usersModel.findById(id);
    res.json({ user });
  } catch (err) { next(err); }
});

router.delete('/users/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('DELETE FROM users WHERE user_id = ? LIMIT 1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Rooms CRUD (use roomsModel)
router.get('/rooms', adminOnly, async (req, res, next) => {
  try {
    const rows = await roomsModel.list({ limit: 1000 });
    res.json({ rooms: rows });
  } catch (err) { next(err); }
});

router.get('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const room = await roomsModel.getById(req.params.id);
    if (!room) return res.status(404).json({ error: 'room not found' });
    res.json({ room });
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

router.post('/rooms', adminOnly, [ body('name').notEmpty(), body('type_id').isInt({ gt: 0 }), body('capacity').optional().isInt({ gt: 0 }), body('status').optional().isIn(['available','occupied']) ], async (req, res, next) => {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const created = await roomsModel.create({ name: req.body.name, type_id: req.body.type_id, capacity: req.body.capacity, status: req.body.status });
    const room = await roomsModel.getById(created.insertId);
    res.status(201).json({ room });
  } catch (err) { next(err); }
});

router.put('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const room = await roomsModel.update(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'room not found or nothing to update' });
    res.json({ room });
  } catch (err) { next(err); }
});

router.delete('/rooms/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('DELETE FROM rooms WHERE room_id = ? LIMIT 1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Menu CRUD
router.get('/menu', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT m.*, mc.category_name FROM menu m LEFT JOIN menu_categories mc ON m.category_id = mc.category_id ORDER BY m.menu_id DESC LIMIT 1000');
    res.json({ menu: rows });
  } catch (err) { next(err); }
});

router.get('/menu/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT m.*, mc.category_name FROM menu m LEFT JOIN menu_categories mc ON m.category_id = mc.category_id WHERE m.menu_id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'menu item not found' });
    res.json({ item: rows[0] });
  } catch (err) { next(err); }
});

router.post('/menu', adminOnly, [
  body('name').notEmpty(),
  body('category_id').isInt({ gt: 0 }),
  body('price').isFloat({ min: 0 }),
  body('description').optional(),
  body('available').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, category_id, price, description, available = true } = req.body;
    const [result] = await require('../../db').query(
      'INSERT INTO menu (name, category_id, price, description, available) VALUES (?,?,?,?,?)',
      [name, category_id, price, description, available]
    );
    
    const [rows] = await require('../../db').query(
      'SELECT m.*, mc.category_name FROM menu m LEFT JOIN menu_categories mc ON m.category_id = mc.category_id WHERE m.menu_id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ menu_item: rows[0] });
  } catch (err) { next(err); }
});

router.put('/menu/:id', adminOnly, [
  param('id').isInt({ gt: 0 }),
  body('name').optional(),
  body('category_id').optional().isInt({ gt: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional(),
  body('available').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const id = req.params.id;
    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.category_id !== undefined) update.category_id = req.body.category_id;
    if (req.body.price !== undefined) update.price = req.body.price;
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.available !== undefined) update.available = req.body.available;
    
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }
    
    await require('../../db').query('UPDATE menu SET ? WHERE menu_id = ?', [update, id]);
    
    const [rows] = await require('../../db').query(
      'SELECT m.*, mc.category_name FROM menu m LEFT JOIN menu_categories mc ON m.category_id = mc.category_id WHERE m.menu_id = ?',
      [id]
    );
    
    if (!rows.length) return res.status(404).json({ error: 'menu item not found' });
    res.json({ menu_item: rows[0] });
  } catch (err) { next(err); }
});

router.delete('/menu/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('DELETE FROM menu WHERE menu_id = ? LIMIT 1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Bookings Management
router.get('/bookings', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query(`
      SELECT b.*, u.name as user_name, r.name as room_name 
      FROM bookings b 
      LEFT JOIN users u ON b.user_id = u.user_id 
      LEFT JOIN rooms r ON b.room_id = r.room_id 
      ORDER BY b.start_time DESC 
      LIMIT 1000
    `);
    res.json({ bookings: rows });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query(`
      SELECT b.*, u.name as user_name, r.name as room_name 
      FROM bookings b 
      LEFT JOIN users u ON b.user_id = u.user_id 
      LEFT JOIN rooms r ON b.room_id = r.room_id 
      WHERE b.booking_id = ? 
      LIMIT 1
    `, [req.params.id]);
    
    if (!rows.length) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking: rows[0] });
  } catch (err) { next(err); }
});

router.put('/bookings/:id/cancel', adminOnly, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    await require('../../db').query('UPDATE bookings SET status = ? WHERE booking_id = ?', ['cancelled', req.params.id]);
    
    const [rows] = await require('../../db').query(`
      SELECT b.*, u.name as user_name, r.name as room_name 
      FROM bookings b 
      LEFT JOIN users u ON b.user_id = u.user_id 
      LEFT JOIN rooms r ON b.room_id = r.room_id 
      WHERE b.booking_id = ? 
      LIMIT 1
    `, [req.params.id]);
    
    if (!rows.length) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking: rows[0], message: 'Booking cancelled successfully' });
  } catch (err) { next(err); }
});

// Menu Categories CRUD
router.get('/menu-categories', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT * FROM menu_categories ORDER BY category_name');
    res.json({ categories: rows });
  } catch (err) { next(err); }
});

router.post('/menu-categories', adminOnly, [ body('category_name').notEmpty() ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const [result] = await require('../../db').query(
      'INSERT INTO menu_categories (category_name) VALUES (?)',
      [req.body.category_name]
    );
    
    const [rows] = await require('../../db').query('SELECT * FROM menu_categories WHERE category_id = ?', [result.insertId]);
    res.status(201).json({ category: rows[0] });
  } catch (err) { next(err); }
});

// Room Types CRUD (for room management)
router.get('/room-types', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await require('../../db').query('SELECT * FROM room_types ORDER BY type_name');
    res.json({ room_types: rows });
  } catch (err) { next(err); }
});

router.post('/room-types', adminOnly, [ body('type_name').notEmpty() ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const [result] = await require('../../db').query(
      'INSERT INTO room_types (type_name) VALUES (?)',
      [req.body.type_name]
    );
    
    const [rows] = await require('../../db').query('SELECT * FROM room_types WHERE type_id = ?', [result.insertId]);
    res.status(201).json({ room_type: rows[0] });
  } catch (err) { next(err); }
});

// ==================== PAYMENT MANAGEMENT ====================

// Get all payments with pagination and search
router.get('/payments', adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause for search and filters
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (search) {
      whereClause += ' AND (payerName LIKE ? OR bank LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (dateFrom) {
      whereClause += ' AND paymentDate >= ?';
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND paymentDate <= ?';
      queryParams.push(dateTo);
    }

    // Get total count
    const [countResult] = await require('../../db').query(
      `SELECT COUNT(*) as total FROM slip_payments ${whereClause}`,
      queryParams
    );
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get payments with pagination
    const [payments] = await require('../../db').query(
      `SELECT * FROM slip_payments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Get statistics
    const [statsResult] = await require('../../db').query(`
      SELECT 
        COUNT(*) as totalPayments,
        SUM(amount) as totalAmount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verifiedCount,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
        SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END) as verifiedAmount
      FROM slip_payments
    `);

    res.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      statistics: statsResult[0]
    });
  } catch (err) { 
    next(err); 
  }
});

// Get single payment by ID
router.get('/payments/:id', adminOnly, [
  param('id').isInt({ gt: 0 }).withMessage('Valid payment ID required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid payment ID', details: errors.array() });
    }

    const [payments] = await require('../../db').query(
      'SELECT * FROM slip_payments WHERE id = ?',
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment: payments[0] });
  } catch (err) { 
    next(err); 
  }
});

// Update payment status
router.patch('/payments/:id/status', adminOnly, [
  param('id').isInt({ gt: 0 }).withMessage('Valid payment ID required'),
  body('status').isIn(['pending', 'verified', 'rejected']).withMessage('Status must be pending, verified, or rejected'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be max 500 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { status, notes } = req.body;
    const paymentId = req.params.id;

    // Check if payment exists
    const [existingPayment] = await require('../../db').query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (existingPayment.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    await require('../../db').query(
      'UPDATE slip_payments SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, paymentId]
    );

    // Log the status change (optional - you can create a payment_logs table)
    console.log(`Payment ${paymentId} status changed to ${status} by admin ${req.user.id}`);

    // Return updated payment
    const [updatedPayment] = await require('../../db').query(
      'SELECT * FROM slip_payments WHERE id = ?',
      [paymentId]
    );

    res.json({ 
      message: 'Payment status updated successfully',
      payment: updatedPayment[0]
    });
  } catch (err) { 
    next(err); 
  }
});

// Delete payment (admin only - use with caution)
router.delete('/payments/:id', adminOnly, [
  param('id').isInt({ gt: 0 }).withMessage('Valid payment ID required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid payment ID', details: errors.array() });
    }

    const paymentId = req.params.id;

    // Check if payment exists
    const [existingPayment] = await require('../../db').query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (existingPayment.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = existingPayment[0];

    // Delete the slip file if exists
    const fs = require('fs-extra');
    const path = require('path');
    
    if (payment.slipPath) {
      const slipFilePath = path.join(__dirname, '../../public/uploads/slips', payment.slipPath);
      try {
        await fs.unlink(slipFilePath);
        console.log(`Deleted slip file: ${payment.slipPath}`);
      } catch (fileErr) {
        console.error('Error deleting slip file:', fileErr);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete payment record
    await require('../../db').query('DELETE FROM payments WHERE id = ?', [paymentId]);

    console.log(`Payment ${paymentId} deleted by admin ${req.user.id}`);

    res.json({ 
      message: 'Payment deleted successfully',
      deletedPayment: payment
    });
  } catch (err) { 
    next(err); 
  }
});

// Export payments to CSV
router.get('/payments/export/csv', adminOnly, async (req, res, next) => {
  try {
    const status = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    // Build WHERE clause for filters
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (dateFrom) {
      whereClause += ' AND paymentDate >= ?';
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND paymentDate <= ?';
      queryParams.push(dateTo);
    }

    // Get all payments matching criteria
    const [payments] = await require('../../db').query(
      `SELECT 
        id, payerName, amount, bank, paymentDate, status, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
       FROM payments ${whereClause} ORDER BY created_at DESC`,
      queryParams
    );

    // Generate CSV content
    const csvHeader = 'ID,ชื่อผู้ชำระ,ยอดเงิน,ธนาคาร,วันที่ชำระ,สถานะ,วันที่บันทึก,วันที่อัปเดต\n';
    const csvRows = payments.map(payment => 
      `${payment.id},"${payment.payerName}",${payment.amount},"${payment.bank}","${payment.paymentDate}","${payment.status}","${payment.created_at}","${payment.updated_at}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    // Set response headers for CSV download
    const filename = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for proper Thai character display in Excel
    res.write('\ufeff');
    res.end(csvContent);
  } catch (err) { 
    next(err); 
  }
});

module.exports = router;
