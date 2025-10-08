var express = require('express');
var router = express.Router();
const db = require('../db');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { 
    title: 'Junrai Karaoke - ระบบจองห้องคาราโอเกะออนไลน์',
    user: req.user || null,
    message: null 
  });
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
  res.render('contact', { 
    title: 'ติดต่อเรา - Junrai Karaoke',
    user: req.user || null 
  });
});

router.get('/loginform', function(req, res, next) {
  res.render('loginForm');
});

router.get('/api-tester', function(req, res, next) {
    res.render('apiTester');
});

router.get('/auth', function(req, res, next) {
    res.render('auth');
});

router.get('/rooms', function(req, res, next) {
    res.render('rooms');
});

router.get('/bookings', function(req, res, next) {
    res.render('bookings');
});

router.get('/dashboard', function(req, res, next) {
    res.render('dashboard');
});

router.get('/admin', function(req, res, next) {
    res.render('admin');
});

router.get('/payment/success', function(req, res, next) {
    res.render('payment-success');
});

router.get('/payment/cancel', function(req, res, next) {
    res.render('payment-cancel');
});

// Forgot password page
router.get('/forgot-password', function(req, res, next) {
    res.render('forgot-password');
});

// Reset password page
router.get('/reset-password/:token', function(req, res, next) {
    const { token } = req.params;
    res.render('reset-password', { token });
});

module.exports = router;
