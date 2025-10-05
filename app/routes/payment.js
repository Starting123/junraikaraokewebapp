const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware to check if user is authenticated (optional for slip payments)
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7); // Remove 'Bearer '
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_in_production');
      req.user = payload;
    } catch (err) {
      // Token is invalid, continue without user
      req.user = null;
    }
  }
  next();
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/slips');
    // Ensure directory exists
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'slip-' + uniqueSuffix + extension);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG, GIF)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Validation rules
const paymentValidation = [
  body('payerName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('ชื่อผู้ชำระต้องมีความยาว 2-255 ตัวอักษร')
    .matches(/^[ก-๙a-zA-Z\s]+$/)
    .withMessage('ชื่อผู้ชำระต้องเป็นภาษาไทยหรืออังกฤษเท่านั้น'),
  
  body('amount')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('ยอดเงินต้องเป็นตัวเลขและมากกว่า 0'),
  
  body('bank')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('กรุณาเลือกธนาคาร'),
  
  body('paymentDate')
    .isISO8601({ strict: true })
    .withMessage('กรุณาเลือกวันที่ชำระ')
    .custom((value) => {
      const paymentDate = new Date(value);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      if (paymentDate > today) {
        throw new Error('วันที่ชำระไม่สามารถเป็นอนาคตได้');
      }
      if (paymentDate < thirtyDaysAgo) {
        throw new Error('วันที่ชำระไม่สามารถย้อนหลังเกิน 30 วันได้');
      }
      return true;
    })
];

// GET /payment - Show payment form
router.get('/', optionalAuth, (req, res) => {
  const bookingId = req.query.booking_id;
  const amount = req.query.amount;
  
  res.render('payment', {
    title: 'ชำระเงิน - Junrai Karaoke',
    errors: [],
    formData: {},
    bookingId: bookingId || '',
    amount: amount || '',
    user: req.user || null,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// POST /payment/submit - Process payment
router.post('/submit', upload.single('uploadSlip'), paymentValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, delete uploaded file if exists
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      
      return res.render('payment', {
        title: 'ชำระเงิน - Junrai Karaoke',
        errors: errors.array(),
        formData: req.body
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.render('payment', {
        title: 'ชำระเงิน - Junrai Karaoke',
        errors: [{ msg: 'กรุณาอัปโหลดสลิปการชำระเงิน' }],
        formData: req.body
      });
    }

    const { payerName, amount, bank, paymentDate } = req.body;
    const slipPath = req.file.filename; // Store only filename, not full path

    // Get additional data from request
    const bookingId = req.body.bookingId ? parseInt(req.body.bookingId) : null;
    const userId = req.user ? req.user.id : null;

    // Insert payment data into slip_payments table
    const insertQuery = `
      INSERT INTO slip_payments (payerName, amount, bank, paymentDate, slipPath, status, payment_method, booking_id, user_id)
      VALUES (?, ?, ?, ?, ?, 'pending', 'bank_transfer', ?, ?)
    `;
    
    const result = await db.query(insertQuery, [payerName, parseFloat(amount), bank, paymentDate, slipPath, bookingId, userId]);
    const paymentId = result.insertId;

    console.log('Payment submitted successfully:', {
      id: paymentId,
      payerName,
      amount,
      bank,
      paymentDate,
      slipPath
    });

    // Redirect to success page with payment ID
    res.redirect(`/payment/success/${paymentId}`);

  } catch (error) {
    console.error('Payment submission error:', error);
    
    // Delete uploaded file if exists
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.render('payment', {
      title: 'ชำระเงิน - Junrai Karaoke',
      errors: [{ msg: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' }],
      formData: req.body
    });
  }
});

// GET /payment/success/:id - Show success page
router.get('/success/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    
    if (!paymentId || isNaN(paymentId)) {
      return res.redirect('/payment');
    }

    // Fetch payment data
    const selectQuery = 'SELECT * FROM slip_payments WHERE id = ?';
    const results = await db.query(selectQuery, [paymentId]);
    
    if (results.length === 0) {
      return res.redirect('/payment');
    }

    const payment = results[0];
    
    res.render('payment_success', {
      title: 'ชำระเงินสำเร็จ - Junrai Karaoke',
      payment: payment
    });

  } catch (error) {
    console.error('Payment success page error:', error);
    res.redirect('/payment');
  }
});

// Enhanced PDF Receipt generation with QR codes
router.get('/receipt/:id/view', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    
    if (!paymentId || isNaN(paymentId)) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Fetch payment data with user and booking details
    const selectQuery = `
      SELECT sp.*, u.username, u.first_name, u.last_name, u.email, u.phone,
             b.booking_date, b.start_time, b.end_time, 
             r.room_name, r.hourly_rate
      FROM slip_payments sp
      LEFT JOIN bookings b ON sp.booking_id = b.id
      LEFT JOIN users u ON b.user_id = u.id  
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE sp.id = ?
    `;
    const results = await db.query(selectQuery, [paymentId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = results[0];
    const pdfBuffer = await generateReceiptPDF(payment, false);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=receipt-' + paymentId + '.pdf');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF view error:', error);
    res.status(500).json({ error: 'Error generating PDF receipt' });
  }
});

// Download PDF Receipt
router.get('/receipt/:id/download', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    
    if (!paymentId || isNaN(paymentId)) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Fetch payment data with user and booking details
    const selectQuery = `
      SELECT sp.*, u.username, u.first_name, u.last_name, u.email, u.phone,
             b.booking_date, b.start_time, b.end_time, 
             r.room_name, r.hourly_rate
      FROM slip_payments sp
      LEFT JOIN bookings b ON sp.booking_id = b.id
      LEFT JOIN users u ON b.user_id = u.id  
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE sp.id = ?
    `;
    const results = await db.query(selectQuery, [paymentId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = results[0];
    const pdfBuffer = await generateReceiptPDF(payment, true);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=JunRaiKaraoke-Receipt-' + paymentId + '.pdf');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Error generating PDF receipt' });
  }
});

// Enhanced PDF Generation Function with Thai Font Support
async function generateReceiptPDF(payment, isDownload = false) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        bufferPages: true,
        autoFirstPage: true,
        size: 'A4',
        info: {
          Title: 'JunRai Karaoke Receipt',
          Author: 'JunRai Karaoke System',
          Creator: 'JunRai Web App'
        }
      });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Comprehensive Thai text converter for PDF compatibility
      const convertThaiText = (text) => {
        if (!text) return 'N/A';
        
        const str = text.toString();
        
        // Complete Thai character to Roman mapping
        const thaiToRoman = {
          // Thai names
          'สมชาย': 'Somchai',
          'ใจดี': 'Jaidee',
          'สมศรี': 'Somsri', 
          'วิชัย': 'Wichai',
          'สุดา': 'Suda',
          'มานี': 'Manee',
          
          // Banks
          'กสิกรไทย': 'Kasikorn Bank',
          'กรุงเทพ': 'Bangkok Bank', 
          'ไทยพาณิชย์': 'SCB Bank',
          'กรุงไทย': 'Krung Thai Bank',
          'ทหารไทยธนชาต': 'TTB Bank',
          'กรุงศรีอยุธยา': 'Krungsri Bank',
          'ออมสิน': 'GSB Bank',
          'อาคารสงเคราะห์': 'GHB Bank',
          'เกียรตินาคิน': 'KKP Bank',
          'ซีไอเอ็มบี ไทย': 'CIMB Thai Bank',
          
          // Rooms 
          'ห้อง': 'Room',
          'ห้องเล็ก': 'Small Room',
          'ห้องกลาง': 'Medium Room', 
          'ห้องใหญ่': 'Large Room',
          'ห้อง VIP': 'VIP Room',
          'VIP A': 'VIP A',
          'VIP B': 'VIP B',
          
          // Common words
          'คาราโอเกะ': 'Karaoke',
          'จุนไร': 'JunRai',
          'บาท': 'Baht',
          'โอเค': 'OK',
          'อื่นๆ': 'Others'
        };
        
        let result = str;
        
        // First, replace known complete phrases
        for (const [thai, roman] of Object.entries(thaiToRoman)) {
          result = result.replace(new RegExp(thai, 'g'), roman);
        }
        
        // Then handle remaining Thai characters individually
        result = result.replace(/[\u0E00-\u0E7F]/g, (char) => {
          const charMap = {
            'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ง': 'ng', 'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ญ': 'y', 'ฎ': 'd',
            'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n', 'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th',
            'น': 'n', 'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y',
            'ร': 'r', 'ล': 'l', 'ว': 'w', 'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h',
            'า': 'a', 'ิ': 'i', 'ี': 'ee', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'oo', 'เ': 'e', 'แ': 'ae', 'โ': 'o',
            'ใ': 'ai', 'ไ': 'ai', '่': '', '้': '', '๊': '', '๋': '', '์': '', '็': '', '๎': '', '๏': '', '๐': '0',
            '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
          };
          
          return charMap[char] || char;
        });
        
        // Clean up multiple spaces and capitalize appropriately
        result = result.replace(/\s+/g, ' ').trim();
        
        // Capitalize first letter of each word for names
        if (/^[a-zA-Z\s]+$/.test(result)) {
          result = result.replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return result;
      };
      
      // Generate QR Code for payment verification
      const qrData = `JunRai-Receipt-${payment.id}-${payment.created_at}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Convert QR Code to buffer
      const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
      
      // Set default font that works better with Thai characters
      doc.font('Helvetica');
      
      // Header with company info (without emoji to avoid rendering issues)
      doc.fontSize(24)
         .fillColor('#e74c3c')
         .text('JunRai Karaoke', 50, 50);
      
      doc.fontSize(12)
         .fillColor('#2c3e50')
         .text('Official Payment Receipt', 50, 80)
         .text('123 Karaoke Street, Bangkok, Thailand 10110', 50, 95)
         .text('Tel: +66-2-123-4567 | Email: info@junraikaraoke.com', 50, 110);
      
      // Add QR Code
      doc.image(qrBuffer, 450, 50, { width: 80, height: 80 });
      
      // Receipt details box
      doc.rect(50, 140, 495, 250).stroke('#34495e');
      
      // Receipt header
      doc.fontSize(16)
         .fillColor('#e74c3c')
         .text('RECEIPT DETAILS', 70, 160);
      
      // Format date in English to avoid Thai font rendering issues
      const formattedDate = new Date(payment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Payment information
      const yStart = 190;
      const leftCol = 70;
      const rightCol = 300;
      
      doc.fontSize(12).fillColor('#2c3e50');
      
      // Left column
      doc.text('Receipt Number:', leftCol, yStart)
         .text('Payment Date:', leftCol, yStart + 20)
         .text('Customer Name:', leftCol, yStart + 40)
         .text('Email:', leftCol, yStart + 60)
         .text('Phone:', leftCol, yStart + 80)
         .text('Room Name:', leftCol, yStart + 100)
         .text('Booking Date:', leftCol, yStart + 120)
         .text('Time Slot:', leftCol, yStart + 140);
      
      // Right column - values (using convertThaiText for Thai characters)
      doc.fillColor('#34495e')
         .text(`#${String(payment.id).padStart(6, '0')}`, rightCol, yStart)
         .text(convertThaiText(formattedDate), rightCol, yStart + 20)
         .text(convertThaiText(payment.payerName), rightCol, yStart + 40)
         .text(convertThaiText(payment.email) || 'N/A', rightCol, yStart + 60)
         .text(convertThaiText(payment.phone) || 'N/A', rightCol, yStart + 80)
         .text(convertThaiText(payment.room_name) || 'N/A', rightCol, yStart + 100);
      
      if (payment.booking_date) {
        const bookingDate = new Date(payment.booking_date).toLocaleDateString('en-US');
        doc.text(convertThaiText(bookingDate), rightCol, yStart + 120);
      } else {
        doc.text('N/A', rightCol, yStart + 120);
      }
      
      if (payment.start_time && payment.end_time) {
        doc.text(convertThaiText(`${payment.start_time} - ${payment.end_time}`), rightCol, yStart + 140);
      } else {
        doc.text('N/A', rightCol, yStart + 140);
      }
      
      // Payment summary box
      doc.rect(50, 410, 495, 120).stroke('#34495e');
      
      doc.fontSize(16)
         .fillColor('#e74c3c')
         .text('PAYMENT SUMMARY', 70, 430);
      
      doc.fontSize(12).fillColor('#2c3e50');
      doc.text('Payment Method:', 70, 460)
         .text('Payment Status:', 70, 480)
         .text('Transaction ID:', 70, 500);
      
      // Payment method without emojis to avoid rendering issues
      let paymentMethodText = payment.payment_method === 'bank_transfer' ? 
          'Bank Transfer (Slip Upload)' : 
          'Credit Card (Stripe)';
      
      doc.fillColor('#34495e')
         .text(convertThaiText(paymentMethodText), 200, 460);
      
      // Status with color coding
      const statusColor = payment.status === 'approved' ? '#27ae60' : 
                         payment.status === 'pending' ? '#f39c12' : '#e74c3c';
      doc.fillColor(statusColor)
         .text(convertThaiText(payment.status.toUpperCase()), 200, 480);
      
      doc.fillColor('#34495e')
         .text(convertThaiText(payment.stripe_session_id || payment.id), 200, 500);
      
      // Amount (highlighted) - using English formatting to avoid Thai font issues
      doc.fontSize(18)
         .fillColor('#e74c3c')
         .text('Total Amount:', 350, 470)
         .fontSize(24)
         .text(`THB ${Number(payment.amount).toLocaleString('en-US')}`, 350, 490);
      
      // Footer with English dates to avoid Thai font issues
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text('This is a computer-generated receipt. No signature required.', 50, 560)
         .text('For inquiries, please contact us at info@junraikaraoke.com', 50, 575)
         .text(`Generated on: ${new Date().toLocaleDateString('en-US')} | QR Code for verification`, 50, 590);
      
      // Watermark for security
      doc.fontSize(8)
         .fillColor('#ecf0f1')
         .text('JUNRAI KARAOKE OFFICIAL RECEIPT', 200, 400, { rotate: 45 });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// ==================== STRIPE PAYMENT ROUTES ====================

// POST /payment/create-stripe-session - Create Stripe Checkout Session
router.post('/create-stripe-session', optionalAuth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('ยอดเงินต้องมากกว่า 0'),
  body('payerName').notEmpty().withMessage('กรุณากรอกชื่อผู้ชำระ'),
  body('bookingId').optional().isInt({ min: 1 }).withMessage('Booking ID ไม่ถูกต้อง')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง', details: errors.array() });
    }

    const { amount, payerName, bookingId } = req.body;
    const userId = req.user ? req.user.id : null;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'thb',
          product_data: {
            name: 'Junrai Karaoke Payment',
            description: `Payment by ${payerName}`
          },
          unit_amount: Math.round(parseFloat(amount) * 100), // Convert to satang
        },
        quantity: 1,
      }],
      customer_email: req.user ? req.user.email : undefined,
      metadata: {
        payerName,
        bookingId: bookingId || '',
        userId: userId || ''
      },
      success_url: `${req.protocol}://${req.get('host')}/payment/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment?cancelled=true`,
    });

    res.json({ 
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้าง Stripe session' });
  }
});

// GET /payment/stripe-success - Handle successful Stripe payment
router.get('/stripe-success', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
      return res.redirect('/payment?error=no_session');
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Save payment record to database
      const insertQuery = `
        INSERT INTO slip_payments (
          payerName, amount, bank, paymentDate, slipPath, status, 
          payment_method, booking_id, user_id, stripe_session_id, stripe_payment_intent_id
        ) VALUES (?, ?, ?, ?, ?, 'verified', 'stripe', ?, ?, ?, ?)
      `;
      
      const paymentAmount = session.amount_total / 100; // Convert from satang to baht
      const result = await db.query(insertQuery, [
        session.metadata.payerName,
        paymentAmount,
        'Stripe Credit Card',
        new Date().toISOString().split('T')[0],
        'stripe_payment', // No slip file for Stripe
        session.metadata.bookingId || null,
        session.metadata.userId || null,
        sessionId,
        session.payment_intent
      ]);

      const paymentId = result.insertId;

      // Update booking payment status if booking_id exists
      if (session.metadata.bookingId) {
        await db.query(
          'UPDATE bookings SET payment_status = "paid" WHERE booking_id = ?',
          [session.metadata.bookingId]
        );
      }

      console.log('Stripe payment successful:', {
        sessionId,
        paymentId,
        amount: paymentAmount,
        payerName: session.metadata.payerName
      });

      // Redirect to success page
      res.redirect(`/payment/success/${paymentId}`);
    } else {
      res.redirect('/payment?error=payment_failed');
    }

  } catch (error) {
    console.error('Stripe success handling error:', error);
    res.redirect('/payment?error=processing_error');
  }
});

// POST /payment/stripe-webhook - Handle Stripe webhooks
router.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      // Additional processing if needed
      break;
    
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.render('payment', {
        title: 'ชำระเงิน - Junrai Karaoke',
        errors: [{ msg: 'ไฟล์มีขนาดใหญ่เกินไป (ขนาดสูงสุด 5MB)' }],
        formData: req.body || {}
      });
    }
  }
  
  if (error.message.includes('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น')) {
    return res.render('payment', {
      title: 'ชำระเงิน - Junrai Karaoke',
      errors: [{ msg: error.message }],
      formData: req.body || {}
    });
  }
  
  next(error);
});

module.exports = router;