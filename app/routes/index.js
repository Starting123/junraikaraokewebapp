var express = require('express');
var router = express.Router();
const db = require('../db');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
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

module.exports = router;
