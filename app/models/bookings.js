// Bookings model for database operations

const db = require('../db');

class BookingsModel {
    // Get all bookings with filters and pagination
    static async getAll(filters = {}, pagination = {}) {
        let query = `
            SELECT 
                b.booking_id,
                b.user_id,
                b.room_id,
                b.start_time,
                b.end_time,
                b.status,
                b.created_at,
                u.name as user_name,
                u.email as user_email,
                r.name as room_name,
                rt.type_name as room_type,
                rt.price_per_hour
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        // Apply filters
        if (filters.user_id) {
            query += ' AND b.user_id = ?';
            queryParams.push(filters.user_id);
        }
        
        if (filters.room_id) {
            query += ' AND b.room_id = ?';
            queryParams.push(filters.room_id);
        }
        
        if (filters.status) {
            query += ' AND b.status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.date_from) {
            query += ' AND DATE(b.start_time) >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND DATE(b.start_time) <= ?';
            queryParams.push(filters.date_to);
        }
        
        // Add search functionality
        if (filters.search) {
            query += ' AND (u.name LIKE ? OR r.name LIKE ? OR u.email LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Order by
        const orderBy = filters.sort || 'b.created_at';
        const orderDirection = filters.order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${orderBy} ${orderDirection}`;
        
        // Pagination
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Get total count for pagination
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;
        
        // Add limit and offset
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
        
        const [rows] = await db.query(query, queryParams);
        
        return {
            bookings: rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
    }
    
    // Get booking by ID
    static async getById(bookingId) {
        const query = `
            SELECT 
                b.booking_id,
                b.user_id,
                b.room_id,
                b.start_time,
                b.end_time,
                b.status,
                b.created_at,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                r.name as room_name,
                r.capacity as room_capacity,
                rt.type_name as room_type,
                rt.price_per_hour
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE b.booking_id = ?
        `;
        
        const [rows] = await db.query(query, [bookingId]);
        return rows[0] || null;
    }
    
    // Get bookings by user ID
    static async getByUserId(userId, status = null) {
        let query = `
            SELECT 
                b.booking_id,
                b.room_id,
                b.start_time,
                b.end_time,
                b.status,
                b.created_at,
                r.name as room_name,
                rt.type_name as room_type,
                rt.price_per_hour
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE b.user_id = ?
        `;
        
        const queryParams = [userId];
        
        if (status) {
            query += ' AND b.status = ?';
            queryParams.push(status);
        }
        
        query += ' ORDER BY b.start_time DESC';
        
        const [rows] = await db.query(query, queryParams);
        return rows;
    }
    
    // Create new booking
    static async create(bookingData) {
        const { user_id, room_id, start_time, end_time } = bookingData;
        
        // First check if room is available for the time slot
        const conflictQuery = `
            SELECT booking_id 
            FROM bookings 
            WHERE room_id = ? 
            AND status = 'active' 
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `;
        
        const [conflicts] = await db.query(conflictQuery, [
            room_id, start_time, start_time, end_time, end_time, start_time, end_time
        ]);
        
        if (conflicts.length > 0) {
            throw new Error('Room is not available for the selected time slot');
        }
        
        // Check if room exists and is available
        const roomQuery = 'SELECT room_id, status FROM rooms WHERE room_id = ?';
        const [roomRows] = await db.query(roomQuery, [room_id]);
        
        if (roomRows.length === 0) {
            throw new Error('Room not found');
        }
        
        if (roomRows[0].status !== 'available') {
            throw new Error('Room is not available');
        }
        
        // Create the booking
        const insertQuery = `
            INSERT INTO bookings (user_id, room_id, start_time, end_time, status) 
            VALUES (?, ?, ?, ?, 'active')
        `;
        
        const [result] = await db.query(insertQuery, [user_id, room_id, start_time, end_time]);
        
        // Return the created booking
        return await this.getById(result.insertId);
    }
    
    // Update booking
    static async update(bookingId, updateData) {
        const allowedFields = ['start_time', 'end_time', 'status'];
        const updates = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }
        
        // If updating time, check for conflicts
        if (updateData.start_time || updateData.end_time) {
            const booking = await this.getById(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            
            const start_time = updateData.start_time || booking.start_time;
            const end_time = updateData.end_time || booking.end_time;
            
            const conflictQuery = `
                SELECT booking_id 
                FROM bookings 
                WHERE room_id = ? 
                AND booking_id != ?
                AND status = 'active' 
                AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            `;
            
            const [conflicts] = await db.query(conflictQuery, [
                booking.room_id, bookingId, start_time, start_time, end_time, end_time, start_time, end_time
            ]);
            
            if (conflicts.length > 0) {
                throw new Error('Room is not available for the updated time slot');
            }
        }
        
        values.push(bookingId);
        const query = `UPDATE bookings SET ${updates.join(', ')} WHERE booking_id = ?`;
        
        const [result] = await db.query(query, values);
        
        if (result.affectedRows === 0) {
            throw new Error('Booking not found or no changes made');
        }
        
        return await this.getById(bookingId);
    }
    
    // Cancel booking
    static async cancel(bookingId, userId = null) {
        let query = 'UPDATE bookings SET status = "cancelled" WHERE booking_id = ?';
        const params = [bookingId];
        
        // If userId is provided, ensure user owns the booking
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        
        const [result] = await db.query(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Booking not found or you do not have permission to cancel it');
        }
        
        return await this.getById(bookingId);
    }
    
    // Delete booking (admin only)
    static async delete(bookingId) {
        const query = 'DELETE FROM bookings WHERE booking_id = ?';
        const [result] = await db.query(query, [bookingId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Booking not found');
        }
        
        return { deleted: true, booking_id: bookingId };
    }
    
    // Get booking statistics
    static async getStats(filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bookings,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                COUNT(CASE WHEN DATE(start_time) = CURDATE() THEN 1 END) as today_bookings,
                COUNT(CASE WHEN start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as week_bookings
            FROM bookings
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (filters.user_id) {
            query += ' AND user_id = ?';
            queryParams.push(filters.user_id);
        }
        
        if (filters.date_from) {
            query += ' AND DATE(start_time) >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND DATE(start_time) <= ?';
            queryParams.push(filters.date_to);
        }
        
        const [rows] = await db.query(query, queryParams);
        return rows[0];
    }
    
    // Check room availability
    static async checkAvailability(roomId, startTime, endTime, excludeBookingId = null) {
        let query = `
            SELECT booking_id 
            FROM bookings 
            WHERE room_id = ? 
            AND status = 'active' 
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `;
        
        const params = [roomId, startTime, startTime, endTime, endTime, startTime, endTime];
        
        if (excludeBookingId) {
            query += ' AND booking_id != ?';
            params.push(excludeBookingId);
        }
        
        const [conflicts] = await db.query(query, params);
        return conflicts.length === 0;
    }
    
    // Get upcoming bookings for a user
    static async getUpcoming(userId, limit = 5) {
        const query = `
            SELECT 
                b.booking_id,
                b.room_id,
                b.start_time,
                b.end_time,
                b.status,
                r.name as room_name,
                rt.type_name as room_type,
                rt.price_per_hour
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE b.user_id = ? 
            AND b.status = 'active'
            AND b.start_time > NOW()
            ORDER BY b.start_time ASC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [userId, limit]);
        return rows;
    }
    
    // Auto-complete past bookings
    static async autoComplete() {
        const query = `
            UPDATE bookings 
            SET status = 'completed' 
            WHERE status = 'active' 
            AND end_time < NOW()
        `;
        
        const [result] = await db.query(query);
        return result.affectedRows;
    }
}

module.exports = BookingsModel;