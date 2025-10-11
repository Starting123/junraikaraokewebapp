const express = require('express');
const router = express.Router();
const db = require('../../db');
const bookingsModel = require('../../models/bookings');
const roomsModel = require('../../models/rooms');
const { body, param, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

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

// Define handleValidation function
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true; // Indicates validation failed
  }
  return false; // Indicates validation passed
}

// Create a booking
router.post('/', authMiddleware, [
  body('room_id').isInt({ gt: 0 }),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('duration_hours').optional().isInt({ min: 1, max: 24 }),
  body('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { room_id, start_time, end_time, duration_hours = 1, customer_id } = req.body;
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (!(start < end)) return res.status(400).json({ error: 'start_time must be before end_time' });

    // check room exists
    const room = await roomsModel.getById(room_id);
    if (!room) return res.status(404).json({ error: 'room not found' });

    // check for overlapping active bookings for the same room
    const availability = await roomsModel.checkRoomAvailability(room_id, start_time, end_time);
    if (!availability.available) {
      const nextAvailableMsg = availability.nextAvailable 
        ? `สามารถจองได้อีกครั้งในเวลา ${new Date(availability.nextAvailable).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}` 
        : '';
      
      return res.status(409).json({ 
        success: false,
        error: 'Error: Room already booked',
        message: availability.message,
        nextAvailable: availability.nextAvailable,
        suggestion: nextAvailableMsg,
        conflicts: availability.conflicts
      });
    }

    // If customer_id is provided and requester is admin, allow creating on behalf of that customer
    let user_id = req.user.user_id;
    if (customer_id) {
      if (req.user.role_id !== 1) return res.status(403).json({ error: 'admin required to create booking for another user' });
      user_id = customer_id;
    }
    
    const booking = await bookingsModel.create({ user_id, room_id, start_time, end_time, duration_hours });
    
    // อัปเดตสถานะห้อง
    await roomsModel.updateRoomStatus();
    
    res.status(201).json({ 
      success: true,
      message: 'Booking successful',
      booking 
    });
  } catch (err) {
    next(err);
  }
});

// Update booking endpoint to accept name, phone, and address
router.post('/book', authMiddleware, [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('phone').isString().notEmpty().withMessage('Phone is required'),
  body('address').optional().isString().withMessage('Address must be a string'),
  body('room_id').isInt({ gt: 0 }).withMessage('Room ID is required'),
  body('start_time').isISO8601().withMessage('Start time must be a valid ISO8601 date'),
  body('end_time').isISO8601().withMessage('End time must be a valid ISO8601 date')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, address, room_id, start_time, end_time } = req.body;

    // Check if user already exists
    const [existingUser] = await db.query('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);

    if (!existingUser.length) {
      // Insert new user details
      await db.query(
        'UPDATE users SET name = ?, phone = ?, address = ? WHERE user_id = ?',
        [name, phone, address || null, req.user.user_id]
      );
    }

    // Check for room availability
    const hasOverlap = await bookingsModel.hasOverlap(room_id, start_time, end_time);
    if (hasOverlap) {
      return res.status(400).json({ error: 'Room is not available for the selected time' });
    }

    // Create booking
    const booking = await bookingsModel.create({
      user_id: req.user.user_id,
      room_id,
      start_time,
      end_time
    });

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (err) {
    next(err);
  }
});

// List bookings (admins see all, users see their own)
router.get('/', authMiddleware, [
  query('room_id').optional().isInt({ gt: 0 }),
  query('status').optional().isIn(['active','cancelled','completed']),
  query('payment_status').optional().isIn(['pending','paid','failed']),
  query('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (handleValidation(res, errors)) return;

    const { room_id, status, payment_status, customer_id } = req.query;
    const isAdmin = req.user.role_id === 1;
    const listUserId = (isAdmin && customer_id) ? customer_id : req.user.user_id;

    console.log('Debug - user_id:', listUserId);

    const rows = await bookingsModel.list({ user_id: listUserId, room_id, status, payment_status, isAdmin });

    console.log('Debug - fetched bookings:', rows);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: isAdmin
          ? 'No bookings found for the given filters.'
          : 'You do not have any bookings matching the criteria.',
      });
    }

    res.json({ bookings: rows });
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    next(err);
  }
});

// Get single booking by id
router.get('/:id', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
  const booking = await bookingsModel.findById(id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

// Cancel a booking (owner or admin)
router.post('/:id/cancel', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
    const booking = await bookingsModel.findById(id);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    if (booking.status === 'cancelled') return res.status(400).json({ 
      success: false,
      error: 'Error: Already cancelled',
      message: 'การจองนี้ถูกยกเลิกไปแล้ว'
    });
    
    await bookingsModel.cancel(id);
    
    // อัปเดตสถานะห้อง
    await roomsModel.updateRoomStatus();
    
    res.json({ 
      success: true,
      message: 'Cancel successful' 
    });
  } catch (err) {
    next(err);
  }
});

// สร้างการชำระเงิน
// Configure multer for file uploads
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/payment-slips/'));
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    cb(null, `payment-proof-${req.params.id}-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/:id/payment', authMiddleware, upload.single('paymentProof'), [
  param('id').isInt({ gt: 0 }),
  body('method').optional().isIn(['cash', 'credit_card', 'bank_transfer', 'qr_code']),
  body('transaction_id').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const booking_id = req.params.id;
    const { method = 'cash', transaction_id } = req.body;
    const uploadedFile = req.file;
    
    const booking = await bookingsModel.findById(booking_id);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    
    if (booking.payment_status === 'paid') return res.status(400).json({ error: 'already paid' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'booking cancelled' });
    
    // ตรวจสอบว่าจำเป็นต้องมีหลักฐานการโอนเงินหรือไม่
    if ((method === 'bank_transfer' || method === 'qr_code') && !uploadedFile) {
      return res.status(400).json({ 
        error: 'กรุณาแนบหลักฐานการโอนเงิน', 
        message: 'สำหรับการชำระผ่านโอนเงินหรือ QR Code กรุณาแนบหลักฐานการโอนเงิน' 
      });
    }
    
    // สร้าง path ของไฟล์หลักฐาน (ถ้ามี)
    const proofPath = uploadedFile ? `/uploads/payment-slips/${uploadedFile.filename}` : null;
    
    const payment = await bookingsModel.createPayment({
      booking_id,
      amount: booking.total_price,
      method,
      transaction_id,
      proof_path: proofPath
    });

    res.json({ success: true, payment, message: 'ชำระเงินสำเร็จ', proof_path: proofPath });
  } catch (err) {
    console.error('Error in POST /:id/payment:', err);
    // Return JSON error so frontend doesn't try to parse HTML error pages
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน', message: err.message });
  }
});

// ดึงข้อมูลการชำระเงิน
router.get('/:id/payment', authMiddleware, [ param('id').isInt({ gt: 0 }) ], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const booking_id = req.params.id;
    const booking = await bookingsModel.findById(booking_id);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    
    const payment = await bookingsModel.getPayment(booking_id);
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

// ดึงสถิติการจองของผู้ใช้
router.get('/my-stats', authMiddleware, async (req, res, next) => {
  try {
    const stats = await bookingsModel.getUserStats(req.user.user_id);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// ดึงรายการจองของผู้ใช้
router.get('/my-bookings', authMiddleware, [
  query('status').optional().isIn(['active','cancelled','completed']),
  query('payment_status').optional().isIn(['pending','paid','failed'])
], async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const { status, payment_status } = req.query;
    const bookings = await bookingsModel.list({ 
      user_id: req.user.user_id, 
      status, 
      payment_status,
      isAdmin: false 
    });
    res.json(bookings); // Return array directly
  } catch (err) {
    next(err);
  }
});

// Fix syntax errors in the `/payment-slip` endpoint
router.get('/:id/payment-slip', authMiddleware, [
  param('id').isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const bookingId = req.params.id;
    console.log(`Fetching payment slip for booking ID: ${bookingId}`);

    // Get booking details with payment info
    const [bookingRows] = await db.query(`
      SELECT 
        b.booking_id,
        b.start_time,
        b.end_time,
        b.total_price,
        b.payment_status,
        u.name AS customer_name,
        u.email AS customer_email,
        r.name AS room_name,
        rt.type_name AS room_type,
        rt.price_per_hour,
        r.capacity
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id  
      LEFT JOIN rooms r ON b.room_id = r.room_id
      LEFT JOIN room_types rt ON r.type_id = rt.type_id
      WHERE b.booking_id = ?
    `, [bookingId]);

    console.log(`Query executed. Rows fetched: ${bookingRows.length}`);

    if (!bookingRows.length) {
      console.error(`Booking ID ${bookingId} not found.`);
      return res.status(404).json({ 
        error: 'Booking not found', 
        message: `No booking found with ID ${bookingId}` 
      });
    }

    const booking = bookingRows[0];

    // Check if user can access this booking
    if (req.user.user_id !== booking.user_id && req.user.role_id !== 1) {
      console.error(`Access denied for user ID ${req.user.user_id} on booking ID ${bookingId}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');

    // Create receipts directory if it doesn't exist
    const receiptsDir = path.join(__dirname, '../../public/receipts');
    if (!fs.existsSync(receiptsDir)) {
      console.log(`Creating receipts directory at ${receiptsDir}`);
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `payment-slip-${booking.booking_id}-${timestamp}.pdf`;
    const filepath = path.join(receiptsDir, filename);

    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: `Payment Receipt - ${booking.room_name}`,
        Author: 'Junrai Karaoke',
        Subject: 'Payment Receipt',
        Keywords: 'receipt, payment, karaoke'
      }
    });

    // Write PDF to file
    const fileStream = fs.createWriteStream(filepath);
    doc.pipe(fileStream);

    // Add content to the PDF
    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Booking ID: ${booking.booking_id}`);
    doc.text(`Customer Name: ${booking.customer_name}`);
    doc.text(`Customer Email: ${booking.customer_email}`);
    doc.text(`Room Name: ${booking.room_name}`);
    doc.text(`Room Type: ${booking.room_type}`);
    doc.text(`Room Capacity: ${booking.capacity}`);
    doc.text(`Start Time: ${new Date(booking.start_time).toLocaleString()}`);
    doc.text(`End Time: ${new Date(booking.end_time).toLocaleString()}`);
    doc.text(`Total Price: ${booking.total_price} THB`);
    doc.text(`Payment Status: ${booking.payment_status}`);
    doc.end();

    // Send the PDF file to the client after writing is complete
    fileStream.on('finish', () => {
      console.log(`PDF generated successfully at ${filepath}`);
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ error: 'Failed to send PDF', message: err.message });
        }
      });
    });

    fileStream.on('error', (fsErr) => {
      console.error('File stream error:', fsErr);
      res.status(500).json({ error: 'Failed to write PDF', message: fsErr.message });
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    next(err);
  }
});

module.exports = router;
