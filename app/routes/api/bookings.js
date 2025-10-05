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

// Create a booking (Updated for Time Slots)
router.post('/', authMiddleware, [
  body('room_id').isInt({ gt: 0 }),
  body('start_datetime').isISO8601(),
  body('end_datetime').isISO8601(),
  body('customer_id').optional().isInt({ gt: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { room_id, start_datetime, end_datetime, customer_id } = req.body;
    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    
    // Basic validation
    if (!(start < end)) {
      return res.status(400).json({ 
        success: false,
        error: 'invalid_time_range', 
        message: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด' 
      });
    }

    // Check if booking is in the past
    const now = new Date();
    if (start < now) {
      return res.status(400).json({ 
        success: false,
        error: 'past_booking', 
        message: 'ไม่สามารถจองในเวลาที่ผ่านไปแล้ว' 
      });
    }

    // Check room exists
    const room = await roomsModel.getById(room_id);
    if (!room) {
      return res.status(404).json({ 
        success: false,
        error: 'room_not_found', 
        message: 'ไม่พบห้องที่ระบุ' 
      });
    }

    // Check time slot availability using new method
    const availability = await roomsModel.checkTimeSlotAvailability(
      room_id, 
      start_datetime, 
      end_datetime
    );
    
    if (!availability.is_available) {
      // Get alternative available slots
      const date = start.toISOString().split('T')[0];
      const preferredTime = start.toTimeString().substr(0, 5);
      const alternativeSlots = await roomsModel.getNextAvailableSlots(
        room_id, 
        date, 
        preferredTime
      );
      
      return res.status(409).json({ 
        success: false,
        error: 'time_slot_unavailable', 
        message: availability.message || 'ช่วงเวลานี้ไม่สามารถจองได้',
        conflict_bookings: availability.conflict_bookings,
        alternative_slots: alternativeSlots.slice(0, 3), // แนะนำ 3 slot แรก
        room_name: room.name
      });
    }

    // If customer_id is provided and requester is admin, allow creating on behalf of that customer
    let user_id = req.user.user_id;
    if (customer_id) {
      if (req.user.role_id !== 1) {
        return res.status(403).json({ 
          success: false,
          error: 'admin_required', 
          message: 'ต้องเป็นผู้ดูแลระบบเท่านั้นที่สามารถจองให้ผู้อื่นได้' 
        });
      }
      user_id = customer_id;
    }
    
    // Calculate duration in hours for backward compatibility
    const duration_hours = Math.ceil((end - start) / (1000 * 60 * 60));
    
    const booking = await bookingsModel.create({ 
      user_id, 
      room_id, 
      start_time: start_datetime, 
      end_time: end_datetime, 
      duration_hours 
    });
    
    // Update room status
    await roomsModel.updateRoomStatus();
    
    res.status(201).json({ 
      success: true,
      message: 'จองห้องสำเร็จ',
      booking: {
        ...booking,
        room_name: room.name,
        time_slot: {
          start: start.toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'}),
          end: end.toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'}),
          date: start.toLocaleDateString('th-TH')
        }
      }
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
router.post('/:id/payment', authMiddleware, [
  param('id').isInt({ gt: 0 }),
  body('method').optional().isIn(['cash', 'credit_card', 'bank_transfer', 'qr_code']),
  body('transaction_id').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const booking_id = req.params.id;
    const { method = 'cash', transaction_id } = req.body;
    
    const booking = await bookingsModel.findById(booking_id);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    
    const isAdmin = req.user.role_id === 1;
    if (!isAdmin && booking.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
    
    if (booking.payment_status === 'paid') return res.status(400).json({ error: 'already paid' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'booking cancelled' });
    
    const payment = await bookingsModel.createPayment({
      booking_id,
      amount: booking.total_price,
      method,
      transaction_id
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

module.exports = router;
