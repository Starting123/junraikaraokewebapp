var express = require('express');
var router = express.Router();
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

/* GET home page with dynamic data. */
router.get('/', async function(req, res, next) {
  try {
    // Load room statistics for homepage
    const [roomStats] = await db.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_rooms,
        COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_rooms
      FROM rooms
    `);
    
    // Load featured/popular rooms (up to 3)
    const [featuredRooms] = await db.query(`
      SELECT r.room_id, r.name, r.capacity, r.status, rt.type_name, rt.price_per_hour
      FROM rooms r 
      LEFT JOIN room_types rt ON r.room_type_id = rt.type_id 
      WHERE r.status = 'available' 
      ORDER BY r.room_id 
      LIMIT 3
    `);
    
    const stats = roomStats[0] || { total_rooms: 0, available_rooms: 0, occupied_rooms: 0 };
    
    res.render('index', { 
      title: 'Junrai Karaoke - ระบบจองห้องคาราโอเกะออนไลน์',
      roomStats: stats,
      featuredRooms: featuredRooms || [],
      user: req.session?.user || null
    });
  } catch (err) {
    console.error('Homepage error:', err);
    // Fallback to basic render on database error
    res.render('index', { 
      title: 'Junrai Karaoke',
      roomStats: { total_rooms: 0, available_rooms: 0, occupied_rooms: 0 },
      featuredRooms: [],
      user: req.session?.user || null
    });
  }
});

router.get('/roomForm', async function(req, res, next) {
  try {
    const [rooms] = await db.query('SELECT * FROM rooms');
    res.render('roomForm', { rooms: rooms });
  } catch (err) {
    next(err);
  }
}); 

router.get('/contact', function(req, res, next) {
  res.render('contact',);
});

router.get('/loginform', function(req, res, next) {
  res.render('loginForm');
});

router.get('/api-tester', function(req, res, next) {
    res.render('apiTester');
});

router.get('/auth', function(req, res, next) {
    // If already logged in, redirect to appropriate dashboard
    if (req.session && req.session.user) {
        const redirectUrl = req.query.redirect || (req.session.user.role_id === 1 ? '/admin' : '/dashboard');
        return res.redirect(redirectUrl);
    }
    
    res.render('auth', {
        redirectUrl: req.query.redirect || '/dashboard'
    });
});

// Web-based logout route
router.post('/logout', function(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

router.get('/logout', function(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

router.get('/rooms', function(req, res, next) {
    res.render('rooms');
});

// Protected routes - require login
router.get('/bookings', requireLogin, function(req, res, next) {
    res.render('bookings', { 
        user: req.session.user,
        title: 'การจองของฉั๑' 
    });
});

router.get('/dashboard', requireLogin, function(req, res, next) {
    res.render('dashboard', { 
        user: req.session.user,
        title: 'แดชบอร์ด'
    });
});

// Admin only route
router.get('/admin', requireAdmin, function(req, res, next) {
    res.render('admin', { 
        user: req.session.user,
        title: 'ผู้ดูแลระบบ'
    });
});

router.get('/payment/success', function(req, res, next) {
    res.render('payment-success');
});

router.get('/payment/cancel', function(req, res, next) {
    res.render('payment-cancel');
});

module.exports = router;
