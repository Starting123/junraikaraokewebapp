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
      LEFT JOIN room_types rt ON r.type_id = rt.type_id 
      WHERE r.status = 'available' 
      ORDER BY r.room_id 
      LIMIT 3
    `);
    
    const stats = roomStats[0] || { total_rooms: 0, available_rooms: 0, occupied_rooms: 0 };
    
    res.render('home-new', { 
      title: 'Junrai Karaoke - ระบบจองห้องคาราโอเกะออนไลน์',
      currentPage: 'home',
      pageCSS: ['index', 'responsive-fixes'],
      roomStats: stats,
      featuredRooms: featuredRooms || [],
      user: req.session?.user || null,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (err) {
    console.error('Homepage error:', err);
    // Fallback to basic render on database error
    res.render('home-new', { 
      title: 'Junrai Karaoke',
      currentPage: 'home',
      pageCSS: ['index', 'responsive-fixes'],
      roomStats: { total_rooms: 0, available_rooms: 0, occupied_rooms: 0 },
      featuredRooms: [],
      user: req.session?.user || null,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
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
  res.render('contact-new', { 
    title: 'ติดต่อเรา - Junrai Karaoke',
    currentPage: 'contact',
    pageCSS: 'contact',
    user: req.session?.user || null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
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
    
    res.render('auth-new', {
        title: 'เข้าสู่ระบบ - Junrai Karaoke',
        currentPage: 'auth',
        pageCSS: 'auth',
        pageScript: 'auth',
        redirectUrl: req.query.redirect || '/dashboard',
        user: null,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
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
    res.render('rooms-new', {
        title: 'ห้องคาราโอเกะ - Junrai Karaoke',
        currentPage: 'rooms',
        pageCSS: 'rooms',
        user: req.session?.user || null,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
});

// Protected routes - require login
router.get('/bookings', requireLogin, function(req, res, next) {
    res.render('bookings-new', { 
        title: 'การจองของฉัน - Junrai Karaoke',
        currentPage: 'bookings',
        pageCSS: 'bookings',
        pageScript: 'bookings',
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
});

router.get('/dashboard', requireLogin, function(req, res, next) {
    res.render('dashboard-new', { 
        title: 'แดชบอร์ด - Junrai Karaoke',
        currentPage: 'dashboard',
        pageCSS: 'dashboard',
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
});

// Admin only route
router.get('/admin', requireAdmin, function(req, res, next) {
    res.render('admin-new', { 
        title: 'ผู้ดูแลระบบ - Junrai Karaoke',
        currentPage: 'admin',
        pageCSS: 'admin',
        pageScript: 'admin',
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
});

router.get('/payment/success', function(req, res, next) {
    res.render('payment-success');
});

router.get('/payment/cancel', function(req, res, next) {
    res.render('payment-cancel');
});

module.exports = router;
