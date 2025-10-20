var express = require('express');
var router = express.Router();
const db = require('../../../db');

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


// Unified auth routes for legacy direct navigation
router.get('/auth', function(req, res, next) {
    res.render('auth/login');
});
router.get('/auth/register', function(req, res, next) {
    res.render('auth/register');
});
router.get('/auth/forgot', function(req, res, next) {
    res.render('auth/forgot-password');
});
router.get('/auth/reset/:token', function(req, res, next) {
    res.render('auth/reset-password', { token: req.params.token });
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

router.get('/payment/success', async function(req, res, next) {
    try {
        const bookingId = req.query.booking_id;
        const paymentIntentId = req.query.payment_intent;
        
        let booking = null;
        let receiptInfo = null;
        
        if (bookingId) {
            const db = require('../../database/legacyDb');
            const query = 'SELECT * FROM bookings WHERE booking_id = ?';
            const [bookings] = await db.execute(query, [bookingId]);
            booking = bookings[0] || null;
            
            // Check for receipt
            if (booking && booking.receipt_path) {
                receiptInfo = {
                    filename: booking.receipt_filename || `ใบเสร็จ_${bookingId}.pdf`,
                    downloadUrl: `/receipts/${booking.receipt_filename}`,
                    receiptNumber: booking.receipt_number
                };
            }
        }
        
        res.render('payment-success', { 
            booking: booking,
            receiptInfo: receiptInfo,
            paymentIntentId: paymentIntentId
        });
    } catch (error) {
        console.error('Error in payment success:', error);
        res.render('payment-success', { 
            booking: null, 
            receiptInfo: null,
            paymentIntentId: req.query.payment_intent
        });
    }
});

router.get('/payment/cancel', function(req, res, next) {
    res.render('payment-cancel');
});

// Stripe Checkout Page
router.get('/payment/stripe-checkout', function(req, res, next) {
    const { payment_intent, booking_id } = req.query;
    res.render('stripe-checkout', { 
        title: 'ชำระเงินด้วยบัตรเครดิต',
        paymentIntentId: payment_intent,
        bookingId: booking_id,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });
});

// Receipts Page - แสดงใบเสร็จทั้งหมด
router.get('/receipts', function(req, res, next) {
    res.render('receipts', { 
        title: 'ใบเสร็จของฉัน',
        user: req.user || null
    });
});

module.exports = router;
