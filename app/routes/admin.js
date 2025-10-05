const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware to verify admin authentication
const verifyAdminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_this_in_production');
        
        // Check if user is admin (role_id = 1)
        if (decoded.role_id !== 1) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// ==========================================
// ADMIN DASHBOARD - MAIN OVERVIEW
// ==========================================

// GET /admin/dashboard - Main dashboard page
router.get('/dashboard', verifyAdminAuth, async (req, res) => {
    try {
        // Get dashboard statistics
        const stats = await getDashboardStats();
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard - JunRai Karaoke',
            admin: req.admin,
            stats: stats,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { error: 'Internal server error' });
    }
});

// API endpoint for dashboard statistics
router.get('/api/stats', verifyAdminAuth, async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// API endpoint for charts data
router.get('/api/charts', verifyAdminAuth, async (req, res) => {
    try {
        const chartsData = await getChartsData();
        res.json(chartsData);
    } catch (error) {
        console.error('Charts API error:', error);
        res.status(500).json({ error: 'Failed to fetch charts data' });
    }
});

// Helper function to get dashboard statistics
async function getDashboardStats() {
    try {
        // Get total counts
        const [membersCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role_id != 1');
        const [roomsCount] = await db.query('SELECT COUNT(*) as count FROM rooms');
        const [bookingsCount] = await db.query('SELECT COUNT(*) as count FROM bookings');
        const [paymentsCount] = await db.query('SELECT COUNT(*) as count FROM slip_payments');
        
        // Get revenue statistics
        const [totalRevenue] = await db.query('SELECT SUM(amount) as total FROM slip_payments WHERE status = "verified"');
        const [monthlyRevenue] = await db.query(`
            SELECT SUM(amount) as total 
            FROM slip_payments 
            WHERE status = "verified" 
            AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `);
        
        // Get recent bookings
        const [recentBookings] = await db.query(`
            SELECT b.*, u.first_name, u.last_name, r.room_name 
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC
            LIMIT 5
        `);
        
        // Get pending payments
        const [pendingPayments] = await db.query(`
            SELECT COUNT(*) as count 
            FROM slip_payments 
            WHERE status = "pending"
        `);

        return {
            totalMembers: membersCount[0].count,
            totalRooms: roomsCount[0].count,
            totalBookings: bookingsCount[0].count,
            totalPayments: paymentsCount[0].count,
            totalRevenue: totalRevenue[0].total || 0,
            monthlyRevenue: monthlyRevenue[0].total || 0,
            pendingPayments: pendingPayments[0].count,
            recentBookings: recentBookings
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
    }
}

// Helper function to get charts data
async function getChartsData() {
    try {
        // Daily bookings for last 7 days
        const [dailyBookings] = await db.query(`
            SELECT 
                DATE(created_at) as date, 
                COUNT(*) as count
            FROM bookings 
            WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        // Daily revenue for last 7 days
        const [dailyRevenue] = await db.query(`
            SELECT 
                DATE(created_at) as date, 
                SUM(amount) as revenue
            FROM slip_payments 
            WHERE status = "verified" 
            AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        // Monthly bookings for current year
        const [monthlyBookings] = await db.query(`
            SELECT 
                MONTH(created_at) as month, 
                COUNT(*) as count
            FROM bookings 
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(created_at)
            ORDER BY month ASC
        `);
        
        // Room utilization
        const [roomUtilization] = await db.query(`
            SELECT 
                r.room_name,
                COUNT(b.id) as booking_count
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            GROUP BY r.id, r.room_name
            ORDER BY booking_count DESC
        `);

        return {
            dailyBookings: dailyBookings,
            dailyRevenue: dailyRevenue,
            monthlyBookings: monthlyBookings,
            roomUtilization: roomUtilization
        };
    } catch (error) {
        console.error('Error getting charts data:', error);
        throw error;
    }
}

// ==========================================
// ADMINS MANAGEMENT
// ==========================================

// GET /admin/admins - List all admins
router.get('/admins', verifyAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        
        let whereClause = 'WHERE role_id = 1';
        let queryParams = [];
        
        if (search) {
            whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
        }
        
        // Get admins with pagination
        const [admins] = await db.query(`
            SELECT id, username, email, first_name, last_name, created_at 
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        // Get total count
        const [totalCount] = await db.query(`
            SELECT COUNT(*) as count FROM users ${whereClause}
        `, queryParams);
        
        const totalPages = Math.ceil(totalCount[0].count / limit);
        
        res.render('admin/admins', {
            title: 'Manage Admins - JunRai Karaoke',
            admins: admins,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            admin: req.admin
        });
    } catch (error) {
        console.error('Admins listing error:', error);
        res.status(500).render('error', { error: 'Failed to load admins' });
    }
});

// POST /admin/admins - Create new admin
router.post('/admins', verifyAdminAuth, [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { username, email, password, first_name, last_name } = req.body;
        
        // Check if admin already exists
        const [existingAdmin] = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ error: 'Admin with this email or username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin
        await db.query(`
            INSERT INTO users (username, email, password, first_name, last_name, role_id)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [username, email, hashedPassword, first_name, last_name]);
        
        res.json({ success: true, message: 'Admin created successfully' });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// PUT /admin/admins/:id - Update admin
router.put('/admins/:id', verifyAdminAuth, [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const adminId = req.params.id;
        const { username, email, first_name, last_name, password } = req.body;
        
        // Check if email/username is taken by another admin
        const [existing] = await db.query(`
            SELECT id FROM users 
            WHERE (email = ? OR username = ?) AND id != ? AND role_id = 1
        `, [email, username, adminId]);
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email or username is already taken' });
        }
        
        let updateQuery = `
            UPDATE users 
            SET username = ?, email = ?, first_name = ?, last_name = ?
        `;
        let updateParams = [username, email, first_name, last_name];
        
        // Update password if provided
        if (password && password.length >= 6) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
        }
        
        updateQuery += ' WHERE id = ? AND role_id = 1';
        updateParams.push(adminId);
        
        await db.query(updateQuery, updateParams);
        
        res.json({ success: true, message: 'Admin updated successfully' });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// DELETE /admin/admins/:id - Delete admin
router.delete('/admins/:id', verifyAdminAuth, async (req, res) => {
    try {
        const adminId = req.params.id;
        
        // Prevent admin from deleting themselves
        if (parseInt(adminId) === req.admin.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        await db.query('DELETE FROM users WHERE id = ? AND role_id = 1', [adminId]);
        
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// ==========================================
// MEMBERS MANAGEMENT
// ==========================================

// GET /admin/members - List all members
router.get('/members', verifyAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        
        let whereClause = 'WHERE role_id != 1';
        let queryParams = [];
        
        if (search) {
            whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
        }
        
        const [members] = await db.query(`
            SELECT id, username, email, first_name, last_name, phone, created_at 
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        const [totalCount] = await db.query(`SELECT COUNT(*) as count FROM users ${whereClause}`, queryParams);
        const totalPages = Math.ceil(totalCount[0].count / limit);
        
        res.render('admin/members', {
            title: 'Manage Members - JunRai Karaoke',
            members: members,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            admin: req.admin
        });
    } catch (error) {
        console.error('Members listing error:', error);
        res.status(500).render('error', { error: 'Failed to load members' });
    }
});

// POST /admin/members - Create new member
router.post('/members', verifyAdminAuth, [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone('th-TH').withMessage('Please provide a valid Thai phone number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { username, email, password, first_name, last_name, phone } = req.body;
        
        const [existing] = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Member with this email or username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.query(`
            INSERT INTO users (username, email, password, first_name, last_name, phone, role_id)
            VALUES (?, ?, ?, ?, ?, ?, 2)
        `, [username, email, hashedPassword, first_name, last_name, phone || null]);
        
        res.json({ success: true, message: 'Member created successfully' });
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// PUT /admin/members/:id - Update member
router.put('/members/:id', verifyAdminAuth, [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone('th-TH').withMessage('Please provide a valid Thai phone number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const memberId = req.params.id;
        const { username, email, first_name, last_name, phone, password } = req.body;
        
        const [existing] = await db.query(`
            SELECT id FROM users 
            WHERE (email = ? OR username = ?) AND id != ?
        `, [email, username, memberId]);
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email or username is already taken' });
        }
        
        let updateQuery = `UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, phone = ?`;
        let updateParams = [username, email, first_name, last_name, phone || null];
        
        if (password && password.length >= 6) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
        }
        
        updateQuery += ' WHERE id = ? AND role_id != 1';
        updateParams.push(memberId);
        
        await db.query(updateQuery, updateParams);
        
        res.json({ success: true, message: 'Member updated successfully' });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// DELETE /admin/members/:id - Delete member
router.delete('/members/:id', verifyAdminAuth, async (req, res) => {
    try {
        const memberId = req.params.id;
        
        // Check if member has bookings
        const [bookings] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?', [memberId]);
        if (bookings[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete member with existing bookings. Please cancel or complete all bookings first.' 
            });
        }
        
        await db.query('DELETE FROM users WHERE id = ? AND role_id != 1', [memberId]);
        
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ==========================================
// ROOMS MANAGEMENT
// ==========================================

// GET /admin/rooms - List all rooms
router.get('/rooms', verifyAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        
        let whereClause = '';
        let queryParams = [];
        
        if (search) {
            whereClause = 'WHERE room_name LIKE ? OR room_type LIKE ?';
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern];
        }
        
        const [rooms] = await db.query(`
            SELECT * FROM rooms 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        const [totalCount] = await db.query(`SELECT COUNT(*) as count FROM rooms ${whereClause}`, queryParams);
        const totalPages = Math.ceil(totalCount[0].count / limit);
        
        res.render('admin/rooms', {
            title: 'Manage Rooms - JunRai Karaoke',
            rooms: rooms,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            admin: req.admin
        });
    } catch (error) {
        console.error('Rooms listing error:', error);
        res.status(500).render('error', { error: 'Failed to load rooms' });
    }
});

// POST /admin/rooms - Create new room
router.post('/rooms', verifyAdminAuth, [
    body('room_name').notEmpty().withMessage('Room name is required'),
    body('room_type').isIn(['small', 'medium', 'large', 'vip']).withMessage('Invalid room type'),
    body('hourly_rate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('status').isIn(['available', 'maintenance', 'unavailable']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { room_name, room_type, hourly_rate, capacity, status, description } = req.body;
        
        // Check if room name already exists
        const [existing] = await db.query('SELECT id FROM rooms WHERE room_name = ?', [room_name]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Room with this name already exists' });
        }
        
        await db.query(`
            INSERT INTO rooms (room_name, room_type, hourly_rate, capacity, status, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [room_name, room_type, hourly_rate, capacity, status, description || null]);
        
        res.json({ success: true, message: 'Room created successfully' });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// PUT /admin/rooms/:id - Update room
router.put('/rooms/:id', verifyAdminAuth, [
    body('room_name').notEmpty().withMessage('Room name is required'),
    body('room_type').isIn(['small', 'medium', 'large', 'vip']).withMessage('Invalid room type'),
    body('hourly_rate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('status').isIn(['available', 'maintenance', 'unavailable']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const roomId = req.params.id;
        const { room_name, room_type, hourly_rate, capacity, status, description } = req.body;
        
        // Check if room name is taken by another room
        const [existing] = await db.query('SELECT id FROM rooms WHERE room_name = ? AND id != ?', [room_name, roomId]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Room name is already taken' });
        }
        
        await db.query(`
            UPDATE rooms 
            SET room_name = ?, room_type = ?, hourly_rate = ?, capacity = ?, status = ?, description = ?
            WHERE id = ?
        `, [room_name, room_type, hourly_rate, capacity, status, description || null, roomId]);
        
        res.json({ success: true, message: 'Room updated successfully' });
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// DELETE /admin/rooms/:id - Delete room
router.delete('/rooms/:id', verifyAdminAuth, async (req, res) => {
    try {
        const roomId = req.params.id;
        
        // Check if room has bookings
        const [bookings] = await db.query('SELECT COUNT(*) as count FROM bookings WHERE room_id = ?', [roomId]);
        if (bookings[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete room with existing bookings. Please cancel or complete all bookings first.' 
            });
        }
        
        await db.query('DELETE FROM rooms WHERE id = ?', [roomId]);
        
        res.json({ success: true, message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// ==========================================
// BOOKINGS MANAGEMENT
// ==========================================

// GET /admin/bookings - List all bookings
router.get('/bookings', verifyAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        let whereClause = '';
        let queryParams = [];
        
        if (search) {
            whereClause = 'WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR r.room_name LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern, searchPattern];
        }
        
        if (status) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += 'b.status = ?';
            queryParams.push(status);
        }
        
        const [bookings] = await db.query(`
            SELECT 
                b.*,
                u.first_name, u.last_name, u.email,
                r.room_name, r.hourly_rate
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        const [totalCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ${whereClause}
        `, queryParams);
        
        const totalPages = Math.ceil(totalCount[0].count / limit);
        
        res.render('admin/bookings', {
            title: 'Manage Bookings - JunRai Karaoke',
            bookings: bookings,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            statusFilter: status,
            admin: req.admin
        });
    } catch (error) {
        console.error('Bookings listing error:', error);
        res.status(500).render('error', { error: 'Failed to load bookings' });
    }
});

// POST /admin/bookings - Create new booking
router.post('/bookings', verifyAdminAuth, [
    body('user_id').isInt().withMessage('Valid user is required'),
    body('room_id').isInt().withMessage('Valid room is required'),
    body('booking_date').isISO8601().withMessage('Valid booking date is required'),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
    body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { user_id, room_id, booking_date, start_time, end_time, notes } = req.body;
        
        // Validate time range
        if (start_time >= end_time) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
        
        // Check room availability
        const [conflicts] = await db.query(`
            SELECT id FROM bookings 
            WHERE room_id = ? 
            AND booking_date = ? 
            AND status != 'cancelled'
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `, [room_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time]);
        
        if (conflicts.length > 0) {
            return res.status(400).json({ error: 'Room is not available at the selected time' });
        }
        
        // Get room rate and calculate total
        const [room] = await db.query('SELECT hourly_rate FROM rooms WHERE id = ?', [room_id]);
        if (room.length === 0) {
            return res.status(400).json({ error: 'Room not found' });
        }
        
        const startHour = parseFloat(start_time.replace(':', '.'));
        const endHour = parseFloat(end_time.replace(':', '.'));
        const hours = endHour - startHour;
        const total_amount = hours * room[0].hourly_rate;
        
        await db.query(`
            INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, total_amount, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
        `, [user_id, room_id, booking_date, start_time, end_time, total_amount, notes || null]);
        
        res.json({ success: true, message: 'Booking created successfully' });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// PUT /admin/bookings/:id - Update booking
router.put('/bookings/:id', verifyAdminAuth, [
    body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const bookingId = req.params.id;
        const { status, notes } = req.body;
        
        await db.query(`
            UPDATE bookings 
            SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, notes || null, bookingId]);
        
        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// DELETE /admin/bookings/:id - Delete booking
router.delete('/bookings/:id', verifyAdminAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Check if booking has payments
        const [payments] = await db.query('SELECT COUNT(*) as count FROM slip_payments WHERE booking_id = ?', [bookingId]);
        if (payments[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete booking with existing payments. Please handle payments first.' 
            });
        }
        
        await db.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
        
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// ==========================================
// PAYMENTS MANAGEMENT
// ==========================================

// GET /admin/payments - List all payments
router.get('/payments', verifyAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const method = req.query.method || '';
        
        let whereClause = '';
        let queryParams = [];
        
        if (search) {
            whereClause = 'WHERE (p.payerName LIKE ? OR p.bank LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
        }
        
        if (status) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += 'p.status = ?';
            queryParams.push(status);
        }
        
        if (method) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += 'p.payment_method = ?';
            queryParams.push(method);
        }
        
        const [payments] = await db.query(`
            SELECT 
                p.*,
                u.first_name, u.last_name,
                b.booking_date, b.start_time, b.end_time,
                r.room_name
            FROM slip_payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        const [totalCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM slip_payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ${whereClause}
        `, queryParams);
        
        const totalPages = Math.ceil(totalCount[0].count / limit);
        
        res.render('admin/payments', {
            title: 'Manage Payments - JunRai Karaoke',
            payments: payments,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            statusFilter: status,
            methodFilter: method,
            admin: req.admin
        });
    } catch (error) {
        console.error('Payments listing error:', error);
        res.status(500).render('error', { error: 'Failed to load payments' });
    }
});

// PUT /admin/payments/:id - Update payment status
router.put('/payments/:id', verifyAdminAuth, [
    body('status').isIn(['pending', 'verified', 'rejected']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const paymentId = req.params.id;
        const { status, admin_notes } = req.body;
        
        await db.query(`
            UPDATE slip_payments 
            SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, admin_notes || null, paymentId]);
        
        // If payment is verified, update booking payment status
        if (status === 'verified') {
            await db.query(`
                UPDATE bookings 
                SET payment_status = 'paid'
                WHERE id = (SELECT booking_id FROM slip_payments WHERE id = ?)
            `, [paymentId]);
        }
        
        res.json({ success: true, message: 'Payment updated successfully' });
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// DELETE /admin/payments/:id - Delete payment
router.delete('/payments/:id', verifyAdminAuth, async (req, res) => {
    try {
        const paymentId = req.params.id;
        
        // Get payment info to delete slip file
        const [payment] = await db.query('SELECT slipPath FROM slip_payments WHERE id = ?', [paymentId]);
        
        await db.query('DELETE FROM slip_payments WHERE id = ?', [paymentId]);
        
        // Delete slip file if exists
        if (payment.length > 0 && payment[0].slipPath && payment[0].slipPath !== 'stripe_payment') {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../public/uploads/slips', payment[0].slipPath);
            
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting slip file:', err);
            });
        }
        
        res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    }
});

// API endpoint to get users for booking form
router.get('/api/users', verifyAdminAuth, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, username, first_name, last_name, email 
            FROM users 
            WHERE role_id != 1 
            ORDER BY first_name ASC
        `);
        res.json(users);
    } catch (error) {
        console.error('Get users API error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// API endpoint to get rooms for booking form
router.get('/api/rooms', verifyAdminAuth, async (req, res) => {
    try {
        const [rooms] = await db.query(`
            SELECT id, room_name, room_type, hourly_rate, capacity, status 
            FROM rooms 
            WHERE status = 'available'
            ORDER BY room_name ASC
        `);
        res.json(rooms);
    } catch (error) {
        console.error('Get rooms API error:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

module.exports = router;