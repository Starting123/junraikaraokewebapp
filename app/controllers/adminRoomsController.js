const db = require('../db');

// Get all rooms with booking statistics
exports.getAllRooms = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*,
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `;
        
        const [rooms] = await db.execute(query);
        
        res.json({
            success: true,
            data: rooms,
            message: 'Rooms retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rooms',
            error: error.message
        });
    }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                r.*,
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            WHERE r.id = ?
            GROUP BY r.id
        `;
        
        const [rooms] = await db.execute(query, [id]);
        
        if (rooms.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        
        res.json({
            success: true,
            data: rooms[0],
            message: 'Room retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room',
            error: error.message
        });
    }
};

// Create new room
exports.createRoom = async (req, res) => {
    try {
        const { name, description, capacity, hourly_rate, room_type, amenities, image_url } = req.body;
        
        // Validate required fields
        if (!name || !capacity || !hourly_rate) {
            return res.status(400).json({
                success: false,
                message: 'Name, capacity, and hourly rate are required'
            });
        }
        
        const query = `
            INSERT INTO rooms (name, description, capacity, hourly_rate, room_type, amenities, image_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'available', NOW())
        `;
        
        const [result] = await db.execute(query, [
            name,
            description || null,
            capacity,
            hourly_rate,
            room_type || 'standard',
            JSON.stringify(amenities || []),
            image_url || null
        ]);
        
        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                name,
                description,
                capacity,
                hourly_rate,
                room_type,
                amenities,
                image_url
            },
            message: 'Room created successfully'
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room',
            error: error.message
        });
    }
};

// Update room
exports.updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, capacity, hourly_rate, room_type, amenities, image_url, status } = req.body;
        
        // Check if room exists
        const [existingRoom] = await db.execute('SELECT id FROM rooms WHERE id = ?', [id]);
        
        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        
        const query = `
            UPDATE rooms 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                capacity = COALESCE(?, capacity),
                hourly_rate = COALESCE(?, hourly_rate),
                room_type = COALESCE(?, room_type),
                amenities = COALESCE(?, amenities),
                image_url = COALESCE(?, image_url),
                status = COALESCE(?, status),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.execute(query, [
            name,
            description,
            capacity,
            hourly_rate,
            room_type,
            amenities ? JSON.stringify(amenities) : null,
            image_url,
            status,
            id
        ]);
        
        res.json({
            success: true,
            message: 'Room updated successfully'
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update room',
            error: error.message
        });
    }
};

// Delete room
exports.deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if room exists
        const [existingRoom] = await db.execute('SELECT id FROM rooms WHERE id = ?', [id]);
        
        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        
        // Check if room has active bookings
        const [activeBookings] = await db.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE room_id = ? AND status IN ("confirmed", "pending")',
            [id]
        );
        
        if (activeBookings[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete room with active bookings'
            });
        }
        
        await db.execute('DELETE FROM rooms WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room',
            error: error.message
        });
    }
};

// Toggle room status
exports.toggleRoomStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get current status
        const [room] = await db.execute('SELECT status FROM rooms WHERE id = ?', [id]);
        
        if (room.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        
        const newStatus = room[0].status === 'available' ? 'maintenance' : 'available';
        
        await db.execute('UPDATE rooms SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
        
        res.json({
            success: true,
            data: { status: newStatus },
            message: `Room status changed to ${newStatus}`
        });
    } catch (error) {
        console.error('Error toggling room status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle room status',
            error: error.message
        });
    }
};

// Get room bookings
exports.getRoomBookings = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                b.*,
                u.username,
                u.email,
                u.full_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.room_id = ?
        `;
        
        const params = [id];
        
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [bookings] = await db.execute(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE room_id = ?';
        const countParams = [id];
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        const [totalCount] = await db.execute(countQuery, countParams);
        
        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount[0].total,
                    pages: Math.ceil(totalCount[0].total / limit)
                }
            },
            message: 'Room bookings retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching room bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room bookings',
            error: error.message
        });
    }
};

// Get room availability
exports.getRoomAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required'
            });
        }
        
        const query = `
            SELECT 
                booking_date,
                start_time,
                end_time,
                status
            FROM bookings
            WHERE room_id = ? 
            AND booking_date = ?
            AND status IN ('confirmed', 'pending')
            ORDER BY start_time
        `;
        
        const [bookings] = await db.execute(query, [id, date]);
        
        res.json({
            success: true,
            data: {
                date,
                bookings,
                available_slots: generateAvailableSlots(bookings)
            },
            message: 'Room availability retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching room availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room availability',
            error: error.message
        });
    }
};

// Helper function to generate available time slots
function generateAvailableSlots(bookings) {
    const slots = [];
    const openTime = 9; // 9 AM
    const closeTime = 23; // 11 PM
    
    for (let hour = openTime; hour < closeTime; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const nextHour = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        const isBooked = bookings.some(booking => {
            const startTime = booking.start_time.substring(0, 5);
            const endTime = booking.end_time.substring(0, 5);
            return timeSlot >= startTime && timeSlot < endTime;
        });
        
        slots.push({
            start_time: timeSlot,
            end_time: nextHour,
            available: !isBooked
        });
    }
    
    return slots;
}