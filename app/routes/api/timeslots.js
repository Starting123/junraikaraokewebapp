const express = require('express');
const router = express.Router();
const db = require('../../db');
const { param, query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const ApiResponse = require('../../middleware/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

// Authentication middleware
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return ApiResponse.unauthorized(res, 'Authentication token required');
    }
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (err) {
        return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
}

// Validation handler
function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        ApiResponse.validationError(res, errors);
        return true;
    }
    return false;
}

/**
 * ==========================================
 * Time Slot Generation Functions
 * ==========================================
 */

// Generate time slots for a specific room and date
function generateTimeSlots(room, date) {
    const slots = [];
    const { open_time, close_time, slot_duration = 60, break_duration = 10 } = room;
    
    // Parse room operating hours
    const [openHour, openMinute] = open_time.split(':').map(Number);
    const [closeHour, closeMinute] = close_time.split(':').map(Number);
    
    // Create start and end times for the given date
    const startTime = new Date(date);
    startTime.setHours(openHour, openMinute, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);
    
    let currentTime = new Date(startTime);
    
    // Generate slots
    while (currentTime < endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + (slot_duration * 60 * 1000));
        
        // Check if slot end doesn't exceed operating hours
        if (slotEnd <= endTime) {
            slots.push({
                start_time: slotStart.toISOString(),
                end_time: slotEnd.toISOString(),
                duration_minutes: slot_duration,
                formatted_time: slotStart.toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                slot_id: `${room.room_id}_${slotStart.getTime()}`
            });
        }
        
        // Move to next slot (including break time)
        currentTime = new Date(currentTime.getTime() + ((slot_duration + break_duration) * 60 * 1000));
    }
    
    return slots;
}

// Check slot availability against bookings
async function checkSlotsAvailability(roomId, date, slots) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all active bookings for this room on this date
    const [bookings] = await db.query(`
        SELECT b.*, u.name as user_name
        FROM bookings b 
        JOIN users u ON b.user_id = u.user_id
        WHERE b.room_id = ? 
        AND b.status = 'active'
        AND DATE(b.start_time) = DATE(?)
        ORDER BY b.start_time ASC
    `, [roomId, date]);
    
    // Mark slots as available/booked
    return slots.map(slot => {
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        
        // Check if this slot conflicts with any booking
        const conflictBooking = bookings.find(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            
            // Check for overlap: slot overlaps if it starts before booking ends and ends after booking starts
            return slotStart < bookingEnd && slotEnd > bookingStart;
        });
        
        return {
            ...slot,
            available: !conflictBooking,
            booking_info: conflictBooking ? {
                booking_id: conflictBooking.booking_id,
                user_name: conflictBooking.user_name,
                start_time: conflictBooking.start_time,
                end_time: conflictBooking.end_time
            } : null
        };
    });
}

/**
 * ==========================================
 * API Routes
 * ==========================================
 */

// GET /api/timeslots/:room_id/:date - Get time slots for specific room and date
router.get('/:room_id/:date', 
    authMiddleware,
    [
        param('room_id').isInt({ gt: 0 }).withMessage('Invalid room ID'),
        param('date').isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
    ],
    async (req, res, next) => {
        try {
            if (handleValidation(req, res)) return;
            
            const { room_id, date } = req.params;
            
            // Get room information
            const [roomRows] = await db.query(`
                SELECT r.*, rt.type_name, rt.price_per_hour 
                FROM rooms r 
                LEFT JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE r.room_id = ? LIMIT 1
            `, [room_id]);
            
            if (roomRows.length === 0) {
                return ApiResponse.notFound(res, 'Room not found');
            }
            
            const room = roomRows[0];
            
            // Generate time slots
            const slots = generateTimeSlots(room, date);
            
            // Check availability
            const slotsWithAvailability = await checkSlotsAvailability(room_id, date, slots);
            
            return ApiResponse.success(res, {
                room,
                date,
                slots: slotsWithAvailability,
                total_slots: slotsWithAvailability.length,
                available_slots: slotsWithAvailability.filter(s => s.available).length,
                booked_slots: slotsWithAvailability.filter(s => !s.available).length
            }, 'Time slots retrieved successfully');
            
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/timeslots/availability/:date - Get availability for all rooms on specific date
router.get('/availability/:date',
    authMiddleware,
    [
        param('date').isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)'),
        query('room_type').optional().isInt({ gt: 0 }).withMessage('Invalid room type')
    ],
    async (req, res, next) => {
        try {
            if (handleValidation(req, res)) return;
            
            const { date } = req.params;
            const { room_type } = req.query;
            
            // Get all rooms (optionally filtered by type)
            let roomQuery = `
                SELECT r.*, rt.type_name, rt.price_per_hour 
                FROM rooms r 
                LEFT JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE r.status = 'available'
            `;
            const roomParams = [];
            
            if (room_type) {
                roomQuery += ' AND r.type_id = ?';
                roomParams.push(room_type);
            }
            
            roomQuery += ' ORDER BY rt.price_per_hour ASC, r.name ASC';
            
            const [rooms] = await db.query(roomQuery, roomParams);
            
            // Generate slots for all rooms
            const roomsWithSlots = await Promise.all(
                rooms.map(async (room) => {
                    const slots = generateTimeSlots(room, date);
                    const slotsWithAvailability = await checkSlotsAvailability(room.room_id, date, slots);
                    
                    return {
                        ...room,
                        slots: slotsWithAvailability,
                        total_slots: slotsWithAvailability.length,
                        available_slots: slotsWithAvailability.filter(s => s.available).length,
                        booked_slots: slotsWithAvailability.filter(s => !s.available).length,
                        availability_percentage: Math.round(
                            (slotsWithAvailability.filter(s => s.available).length / slotsWithAvailability.length) * 100
                        )
                    };
                })
            );
            
            return ApiResponse.success(res, {
                date,
                rooms: roomsWithSlots,
                summary: {
                    total_rooms: roomsWithSlots.length,
                    total_slots: roomsWithSlots.reduce((sum, room) => sum + room.total_slots, 0),
                    available_slots: roomsWithSlots.reduce((sum, room) => sum + room.available_slots, 0),
                    booked_slots: roomsWithSlots.reduce((sum, room) => sum + room.booked_slots, 0)
                }
            }, 'Room availability retrieved successfully');
            
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/timeslots/room-types - Get all room types for filtering
router.get('/room-types', authMiddleware, async (req, res, next) => {
    try {
        const [roomTypes] = await db.query(`
            SELECT * FROM room_types 
            ORDER BY price_per_hour ASC
        `);
        
        return ApiResponse.success(res, {
            room_types: roomTypes
        }, 'Room types retrieved successfully');
        
    } catch (err) {
        next(err);
    }
});

module.exports = router;