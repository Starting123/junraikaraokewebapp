// Rooms model for database operations

const db = require('../db');

class RoomsModel {
    // Get all rooms with filters and pagination
    static async getAll(filters = {}, pagination = {}) {
        let query = `
            SELECT 
                r.room_id,
                r.name,
                r.type_id,
                r.status,
                r.capacity,
                rt.type_name,
                rt.price_per_hour
            FROM rooms r
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        // Apply filters
        if (filters.type_id) {
            query += ' AND r.type_id = ?';
            queryParams.push(filters.type_id);
        }
        
        if (filters.status) {
            query += ' AND r.status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.capacity_min) {
            query += ' AND r.capacity >= ?';
            queryParams.push(filters.capacity_min);
        }
        
        if (filters.capacity_max) {
            query += ' AND r.capacity <= ?';
            queryParams.push(filters.capacity_max);
        }
        
        if (filters.search) {
            query += ' AND (r.name LIKE ? OR rt.type_name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            queryParams.push(searchTerm, searchTerm);
        }
        
        // Order by
        const orderBy = filters.sort || 'r.room_id';
        const orderDirection = filters.order === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${orderBy} ${orderDirection}`;
        
        // Pagination
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Get total count for pagination
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;
        
        // Add limit and offset for pagination
        if (pagination.page && pagination.limit) {
            query += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);
        }
        
        const [rows] = await db.query(query, queryParams);
        
        const result = {
            rooms: rows
        };
        
        // Add pagination info if requested
        if (pagination.page && pagination.limit) {
            result.pagination = {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            };
        }
        
        return result;
    }
    
    // Get room by ID
    static async getById(roomId) {
        const query = `
            SELECT 
                r.room_id,
                r.name,
                r.type_id,
                r.status,
                r.capacity,
                rt.type_name,
                rt.price_per_hour
            FROM rooms r
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE r.room_id = ?
        `;
        
        const [rows] = await db.query(query, [roomId]);
        return rows[0] || null;
    }
    
    // Get available rooms for a specific time slot
    static async getAvailable(startTime, endTime, filters = {}) {
        let query = `
            SELECT 
                r.room_id,
                r.name,
                r.type_id,
                r.status,
                r.capacity,
                rt.type_name,
                rt.price_per_hour
            FROM rooms r
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            WHERE r.status = 'available'
            AND r.room_id NOT IN (
                SELECT DISTINCT room_id 
                FROM bookings 
                WHERE status = 'active' 
                AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            )
        `;
        
        const queryParams = [startTime, startTime, endTime, endTime, startTime, endTime];
        
        // Apply additional filters
        if (filters.type_id) {
            query += ' AND r.type_id = ?';
            queryParams.push(filters.type_id);
        }
        
        if (filters.capacity_min) {
            query += ' AND r.capacity >= ?';
            queryParams.push(filters.capacity_min);
        }
        
        if (filters.capacity_max) {
            query += ' AND r.capacity <= ?';
            queryParams.push(filters.capacity_max);
        }
        
        query += ' ORDER BY rt.price_per_hour ASC, r.capacity ASC';
        
        const [rows] = await db.query(query, queryParams);
        return rows;
    }
    
    // Create new room (admin only)
    static async create(roomData) {
        const { name, type_id, capacity = 1, status = 'available' } = roomData;
        
        // Check if room type exists
        const typeQuery = 'SELECT type_id FROM room_types WHERE type_id = ?';
        const [typeRows] = await db.query(typeQuery, [type_id]);
        
        if (typeRows.length === 0) {
            throw new Error('Room type not found');
        }
        
        // Check if room name already exists
        const nameQuery = 'SELECT room_id FROM rooms WHERE name = ?';
        const [nameRows] = await db.query(nameQuery, [name]);
        
        if (nameRows.length > 0) {
            throw new Error('Room name already exists');
        }
        
        const insertQuery = `
            INSERT INTO rooms (name, type_id, capacity, status) 
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await db.query(insertQuery, [name, type_id, capacity, status]);
        
        return await this.getById(result.insertId);
    }
    
    // Update room
    static async update(roomId, updateData) {
        const allowedFields = ['name', 'type_id', 'capacity', 'status'];
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
        
        // If updating name, check for duplicates
        if (updateData.name) {
            const nameQuery = 'SELECT room_id FROM rooms WHERE name = ? AND room_id != ?';
            const [nameRows] = await db.query(nameQuery, [updateData.name, roomId]);
            
            if (nameRows.length > 0) {
                throw new Error('Room name already exists');
            }
        }
        
        // If updating type_id, check if type exists
        if (updateData.type_id) {
            const typeQuery = 'SELECT type_id FROM room_types WHERE type_id = ?';
            const [typeRows] = await db.query(typeQuery, [updateData.type_id]);
            
            if (typeRows.length === 0) {
                throw new Error('Room type not found');
            }
        }
        
        values.push(roomId);
        const query = `UPDATE rooms SET ${updates.join(', ')} WHERE room_id = ?`;
        
        const [result] = await db.query(query, values);
        
        if (result.affectedRows === 0) {
            throw new Error('Room not found or no changes made');
        }
        
        return await this.getById(roomId);
    }
    
    // Delete room (admin only)
    static async delete(roomId) {
        // Check if room has active bookings
        const bookingQuery = `
            SELECT booking_id 
            FROM bookings 
            WHERE room_id = ? AND status = 'active' AND start_time > NOW()
        `;
        const [bookingRows] = await db.query(bookingQuery, [roomId]);
        
        if (bookingRows.length > 0) {
            throw new Error('Cannot delete room with active future bookings');
        }
        
        const query = 'DELETE FROM rooms WHERE room_id = ?';
        const [result] = await db.query(query, [roomId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Room not found');
        }
        
        return { deleted: true, room_id: roomId };
    }
    
    // Update room status
    static async updateStatus(roomId, status) {
        const validStatuses = ['available', 'occupied'];
        
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status. Must be: available, occupied');
        }
        
        const query = 'UPDATE rooms SET status = ? WHERE room_id = ?';
        const [result] = await db.query(query, [status, roomId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Room not found');
        }
        
        return await this.getById(roomId);
    }
    
    // Get room statistics
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_rooms,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_rooms,
                COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_rooms,
                AVG(capacity) as avg_capacity,
                MAX(capacity) as max_capacity,
                MIN(capacity) as min_capacity
            FROM rooms
        `;
        
        const [rows] = await db.query(query);
        return rows[0];
    }
    
    // Get room types
    static async getRoomTypes() {
        const query = `
            SELECT 
                rt.type_id,
                rt.type_name,
                rt.price_per_hour,
                COUNT(r.room_id) as room_count
            FROM room_types rt
            LEFT JOIN rooms r ON rt.type_id = r.type_id
            GROUP BY rt.type_id
            ORDER BY rt.price_per_hour ASC
        `;
        
        const [rows] = await db.query(query);
        return rows;
    }
    
    // Check room availability for specific time
    static async checkAvailability(roomId, startTime, endTime) {
        const room = await this.getById(roomId);
        
        if (!room) {
            return { available: false, reason: 'Room not found' };
        }
        
        if (room.status !== 'available') {
            return { available: false, reason: 'Room is not available' };
        }
        
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
            roomId, startTime, startTime, endTime, endTime, startTime, endTime
        ]);
        
        if (conflicts.length > 0) {
            return { available: false, reason: 'Room is booked for this time slot' };
        }
        
        return { available: true, room: room };
    }
    
    // Get room schedule for a specific date
    static async getSchedule(roomId, date) {
        const room = await this.getById(roomId);
        
        if (!room) {
            throw new Error('Room not found');
        }
        
        const query = `
            SELECT 
                b.booking_id,
                b.start_time,
                b.end_time,
                b.status,
                u.name as user_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE b.room_id = ? 
            AND DATE(b.start_time) = ?
            AND b.status IN ('active', 'completed')
            ORDER BY b.start_time ASC
        `;
        
        const [bookings] = await db.query(query, [roomId, date]);
        
        return {
            room: room,
            date: date,
            bookings: bookings
        };
    }
    
    // Get popular rooms (most booked)
    static async getPopular(limit = 5) {
        const query = `
            SELECT 
                r.room_id,
                r.name,
                r.type_id,
                r.status,
                r.capacity,
                rt.type_name,
                rt.price_per_hour,
                COUNT(b.booking_id) as booking_count
            FROM rooms r
            LEFT JOIN room_types rt ON r.type_id = rt.type_id
            LEFT JOIN bookings b ON r.room_id = b.room_id 
                AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY r.room_id
            ORDER BY booking_count DESC, r.room_id ASC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [limit]);
        return rows;
    }
    
    // Auto-update room status based on bookings
    static async autoUpdateStatus() {
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // Set rooms to occupied if they have active bookings right now
        const occupyQuery = `
            UPDATE rooms 
            SET status = 'occupied' 
            WHERE room_id IN (
                SELECT DISTINCT room_id 
                FROM bookings 
                WHERE status = 'active' 
                AND start_time <= ? 
                AND end_time > ?
            )
        `;
        
        const [occupyResult] = await db.query(occupyQuery, [currentTime, currentTime]);
        
        // Set rooms to available if no active bookings
        const availableQuery = `
            UPDATE rooms 
            SET status = 'available' 
            WHERE room_id NOT IN (
                SELECT DISTINCT room_id 
                FROM bookings 
                WHERE status = 'active' 
                AND start_time <= ? 
                AND end_time > ?
            )
        `;
        
        const [availableResult] = await db.query(availableQuery, [currentTime, currentTime]);
        
        return {
            occupied: occupyResult.affectedRows,
            available: availableResult.affectedRows
        };
    }
}

module.exports = RoomsModel;