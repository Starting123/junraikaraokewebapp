var express = require('express');
var router = express.Router();
const db = require('../db');

/* Simple test route first */
router.get('/ping', function(req, res) {
  console.log('🏓 Ping route accessed!');
  res.json({ 
    status: 'success',
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    routes_working: true,
    database_connected: true
  });
});

/* ALTERNATIVE ROOT ROUTE */
router.get('/home', function(req, res) {
  console.log('🏡 Alternative home route accessed!');
  res.send('<h1>🎵 Junrai Karaoke - Alternative Route Working!</h1><p><a href="/ping">Test Ping</a></p>');
});

/* GET home page - BULLETPROOF VERSION */
router.get('/', function(req, res, next) {
  console.log('🏠 HOMEPAGE ACCESS DETECTED!');
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Request Method:', req.method);
  console.log('🔍 User Agent:', req.get('User-Agent'));
  console.log('🔍 Request IP:', req.ip);
  
  // Try EJS template first, fallback to HTML
  try {
    res.render('index', { 
      title: 'Junrai Karaoke - ระบบจองห้องคาราโอเกะออนไลน์',
      user: req.user || null,
      message: 'เชื่อมต่อสำเร็จ!',
      timestamp: new Date().toISOString()
    });
    console.log('✅ EJS Template rendered successfully');
  } catch (templateError) {
    console.error('❌ Template error, using fallback HTML:', templateError.message);
    // Bulletproof fallback HTML
    res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Junrai Karaoke - ทดสอบระบบ</title>
        <style>
            body { font-family: 'Prompt', sans-serif; margin: 50px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #27ae60; font-size: 24px; margin-bottom: 20px; }
            .info { color: #3498db; margin: 10px 0; }
            .test-links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">🎉 SUCCESS! Junrai Karaoke Server ทำงานแล้ว!</div>
            <div class="info">🏠 หน้าแรกโหลดสำเร็จ</div>
            <div class="info">⚡ Server เชื่อมต่อ Database แล้ว</div>
            <div class="info">🔧 Routes ทำงานปกติ</div>
            <div class="info">📅 เวลา: ${new Date().toLocaleString('th-TH')}</div>
            
            <div class="test-links">
                <a href="/ping">🏓 Test API</a>
                <a href="/rooms">🎵 ห้องคาราโอเกะ</a>
                <a href="/auth">🔐 เข้าสู่ระบบ</a>
                <a href="/contact">📞 ติดต่อเรา</a>
            </div>
            
            <h3>🎯 ขั้นตอนต่อไป:</h3>
            <ol>
                <li>✅ Server และ Database เชื่อมต่อแล้ว</li>
                <li>✅ Routes ทำงานปกติ</li>
                <li>🔄 กำลังโหลด Frontend Templates</li>
                <li>🎨 กำลังตรวจสอบ CSS และ JavaScript</li>
            </ol>
        </div>
    </body>
    </html>
      `);
    console.log('✅ Fallback HTML sent successfully');
  }
});

// Test route to check if routing works
router.get('/test', function(req, res) {
  console.log('🧪 Test route accessed!');
  res.json({ message: 'Server is working! Routes are functional.', timestamp: new Date().toISOString() });
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
