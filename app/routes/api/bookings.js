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

// List bookings (admins see all, users see their own)
router.get('/', authMiddleware, [
  query('room_id').optional().isInt({ gt: 0 }),
  query('status').optional().isIn(['active','cancelled','completed']),
  query('payment_status').optional().isIn(['pending','paid','failed']),
  query('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { room_id, status, payment_status, customer_id } = req.query;
    const isAdmin = req.user.role_id === 1;
    // If admin provided customer_id use that, otherwise non-admins always get their own bookings
    const listUserId = (isAdmin && customer_id) ? customer_id : req.user.user_id;
    const rows = await bookingsModel.list({ user_id: listUserId, room_id, status, payment_status, isAdmin });
    res.json({ bookings: rows });
  } catch (err) {
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
    
    res.json({ payment, message: 'ชำระเงินสำเร็จ' });
  } catch (err) {
    next(err);
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
    const { status, payment_status } = req.query;
    const bookings = await bookingsModel.list({ 
      user_id: req.user.user_id, 
      status, 
      payment_status,
      isAdmin: false 
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// Generate PDF Payment Slip
router.get('/:id/payment-slip', authMiddleware, [
  param('id').isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const bookingId = req.params.id;
    
    // Get booking details with payment info
    const [bookingRows] = await db.query(`
      SELECT 
        b.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone,
        r.name as room_name,
        rt.type_name,
        rt.price_per_hour,
        r.capacity
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id  
      LEFT JOIN rooms r ON b.room_id = r.room_id
      LEFT JOIN room_types rt ON r.type_id = rt.type_id
      WHERE b.booking_id = ?
    `, [bookingId]);

    console.log(`Searching for booking ID: ${bookingId}`);
    console.log(`Found ${bookingRows.length} booking(s)`);
    
    if (!bookingRows.length) {
      console.log(`Booking ID ${bookingId} not found in database`);
      return res.status(404).json({ 
        error: 'ไม่พบข้อมูลการจอง', 
        message: `ไม่พบการจองหมายเลข ${bookingId}` 
      });
    }
    
    const booking = bookingRows[0];
    
    // Check if user can access this booking
    if (req.user.user_id !== booking.user_id && req.user.role_id !== 1) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if payment is completed
    console.log(`Booking ${bookingId} payment status: ${booking.payment_status}`);
    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'การชำระเงินยังไม่เสร็จสิ้น', 
        message: `การจองหมายเลข ${bookingId} ยังไม่ได้ชำระเงิน (สถานะ: ${booking.payment_status})`,
        booking_id: bookingId,
        payment_status: booking.payment_status
      });
    }
    
    // Generate PDF
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    
    // Create receipts directory if it doesn't exist
    const receiptsDir = path.join(__dirname, '../../public/receipts');
    if (!fs.existsSync(receiptsDir)) {
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
        Title: `ใบเสร็จการชำระเงิน - ${booking.room_name}`,
        Author: 'Junrai Karaoke',
        Subject: 'Payment Receipt',
        Keywords: 'receipt, payment, karaoke'
      }
    });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payment-slip-${booking.booking_id}.pdf"`);
    
    // Create file stream and pipe to both response and file
    const fileStream = fs.createWriteStream(filepath);
    doc.pipe(fileStream);
    doc.pipe(res);
    
    // Header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Junrai Karaoke', 50, 50)
       .fontSize(16)
       .font('Helvetica')
       .text('ใบเสร็จรับเงิน / Payment Receipt', 50, 80);
    
    // Receipt number and date
    doc.fontSize(12)
       .text(`เลขที่ใบเสร็จ / Receipt No.: ${booking.booking_id}`, 50, 120)
       .text(`วันที่ / Date: ${new Date(booking.payment_date || booking.created_at).toLocaleDateString('th-TH')}`, 50, 140);
    
    // Customer information
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ข้อมูลลูกค้า / Customer Information', 50, 180)
       .font('Helvetica')
       .fontSize(12)
       .text(`ชื่อ / Name: ${booking.customer_name}`, 50, 200)
       .text(`อีเมล / Email: ${booking.customer_email}`, 50, 220);
    
    if (booking.phone) {
      doc.text(`เบอร์โทร / Phone: ${booking.phone}`, 50, 240);
    }
    
    // Booking details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('รายละเอียดการจอง / Booking Details', 50, 280)
       .font('Helvetica')
       .fontSize(12)
       .text(`ห้อง / Room: ${booking.room_name}`, 50, 300)
       .text(`ประเภท / Type: ${booking.type_name || 'ห้องธรรมดา'}`, 50, 320)
       .text(`ความจุ / Capacity: ${booking.capacity} คน`, 50, 340)
       .text(`วันที่จอง / Booking Date: ${new Date(booking.start_time).toLocaleDateString('th-TH')}`, 50, 360)
       .text(`เวลา / Time: ${new Date(booking.start_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})} - ${new Date(booking.end_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}`, 50, 380)
       .text(`ระยะเวลา / Duration: ${booking.duration_hours} ชั่วโมง`, 50, 400);
    
    // Payment details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('รายละเอียดการชำระเงิน / Payment Details', 50, 440)
       .font('Helvetica')
       .fontSize(12)
       .text(`ราคาต่อชั่วโมง / Price per Hour: ฿${booking.price_per_hour}`, 50, 460)
       .text(`จำนวนชั่วโมง / Total Hours: ${booking.duration_hours}`, 50, 480)
       .text(`ยอดรวม / Total Amount: ฿${booking.total_price}`, 50, 500)
       .text(`วิธีการชำระ / Payment Method: ${booking.payment_method || 'ไม่ระบุ'}`, 50, 520)
       .text(`สถานะ / Status: ชำระเงินแล้ว / Paid`, 50, 540);
    
    // Footer
    doc.fontSize(10)
       .text('ขอบคุณที่ใช้บริการ Junrai Karaoke', 50, 700)
       .text('Thank you for choosing Junrai Karaoke', 50, 715)
       .text('โทรศัพท์ / Phone: 02-xxx-xxxx', 50, 735)
       .text('อีเมล / Email: info@junraikaraoke.com', 50, 750);
    
    // Finalize PDF
    doc.end();
    
    // Update database with PDF file path (after file is written)
    fileStream.on('finish', async () => {
      try {
        console.log(`PDF saved to: ${filepath}`);
        
        // Update booking record with PDF path
        await db.query(`
          UPDATE bookings 
          SET receipt_pdf_path = ? 
          WHERE booking_id = ?
        `, [`/receipts/${filename}`, bookingId]);
        
        console.log(`Updated booking ${bookingId} with PDF path: /receipts/${filename}`);
        
      } catch (updateErr) {
        console.error('Error updating booking with PDF path:', updateErr);
      }
    });
    
  } catch (err) {
    console.error('Error generating PDF:', err);
    next(err);
  }
});

module.exports = router;
