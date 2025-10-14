const { promisePool } = require('../../../core/config/database');

class Booking {
    toJSON() {
        return {
            booking_id: this.booking_id,
            user_id: this.user_id,
            room_id: this.room_id,
            start_time: this.start_time,
            end_time: this.end_time,
            status: this.status,
            total_price: this.total_price,
            duration_hours: this.duration_hours,
            payment_status: this.payment_status,
            created_at: this.created_at,
            updated_at: this.updated_at,
            room_name: this.room_name,
            user_name: this.user_name,
            capacity: this.capacity,
            type_name: this.type_name,
            price_per_hour: this.price_per_hour,
            room_status: this.room_status
        };
    }
    constructor(data) {
        this.booking_id = data.booking_id;
        this.user_id = data.user_id;
        this.room_id = data.room_id;
        this.start_time = data.start_time;
        this.end_time = data.end_time;
        this.status = data.status;
        this.total_price = data.total_price;
        this.duration_hours = data.duration_hours;
        this.payment_status = data.payment_status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        // joined fields
        this.room_name = data.room_name;
        this.user_name = data.user_name;
        this.capacity = data.capacity;
        this.type_name = data.type_name;
        this.price_per_hour = data.price_per_hour;
        this.room_status = data.room_status;
    }

    static async create({ user_id, room_id, start_time, end_time, duration_hours = 1 }) {
        try {
            // ดึงราคาห้อง
            const [roomData] = await promisePool.query(
                'SELECT rt.price_per_hour FROM rooms r JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ?', 
                [room_id]
            );
            const pricePerHour = roomData.length ? roomData[0].price_per_hour : 0;
            const totalPrice = pricePerHour * duration_hours;

            const [result] = await promisePool.query(
                'INSERT INTO bookings (user_id, room_id, start_time, end_time, status, total_price, duration_hours, payment_status) VALUES (?,?,?,?,?,?,?,?)', 
                [user_id, room_id, start_time, end_time, 'active', totalPrice, duration_hours, 'pending']
            );

            return await this.findById(result.insertId);
        } catch (error) {
            throw new Error(`Error creating booking: ${error.message}`);
        }
    }

    static async findById(id) {
        try {
            const [rows] = await promisePool.query(`
                SELECT b.*, u.name as user_name, r.name as room_name, r.capacity, 
                       rt.type_name, rt.price_per_hour, r.status as room_status
                FROM bookings b 
                JOIN users u ON b.user_id = u.user_id 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id 
                WHERE b.booking_id = ? LIMIT 1
            `, [id]);
            return rows.length ? new Booking(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding booking by ID: ${error.message}`);
        }
    }

    static async findAll({ user_id, room_id, status, payment_status, isAdmin, limit = 200 } = {}) {
        try {
            const params = [];
            let sql = `
                SELECT b.*, u.name as user_name, r.name as room_name, r.capacity,
                       rt.type_name, rt.price_per_hour, r.status as room_status
                FROM bookings b 
                JOIN users u ON b.user_id = u.user_id 
                JOIN rooms r ON b.room_id = r.room_id 
                JOIN room_types rt ON r.type_id = rt.type_id
            `;
            const where = [];

            if (user_id) {
                where.push('b.user_id = ?');
                params.push(user_id);
            }

            if (room_id) {
                where.push('b.room_id = ?');
                params.push(room_id);
            }

            if (status) {
                where.push('b.status = ?');
                params.push(status);
            }

            if (payment_status) {
                where.push('b.payment_status = ?');
                params.push(payment_status);
            }

            if (where.length > 0) {
                sql += ' WHERE ' + where.join(' AND ');
            }

            sql += ' ORDER BY b.created_at DESC LIMIT ?';
            params.push(limit);

            const [rows] = await promisePool.query(sql, params);
            return rows.map(row => new Booking(row));
        } catch (error) {
            throw new Error(`Error finding bookings: ${error.message}`);
        }
    }

    static async checkTimeSlotAvailability(room_id, start_time, end_time, excludeBookingId = null) {
        try {
            let sql = `
                SELECT COUNT(*) as count 
                FROM bookings 
                WHERE room_id = ? 
                AND status IN ('active', 'confirmed') 
                AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
            `;
            let params = [room_id, start_time, start_time, end_time, end_time];

            if (excludeBookingId) {
                sql += ' AND booking_id != ?';
                params.push(excludeBookingId);
            }

            const [rows] = await promisePool.query(sql, params);
            return rows[0].count === 0;
        } catch (error) {
            throw new Error(`Error checking time slot availability: ${error.message}`);
        }
    }

    static async update(booking_id, updateData) {
        try {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const [result] = await promisePool.query(
                `UPDATE bookings SET ${setClause} WHERE booking_id = ?`,
                [...values, booking_id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating booking: ${error.message}`);
        }
    }

    static async delete(booking_id) {
        try {
            const [result] = await promisePool.query(
                'DELETE FROM bookings WHERE booking_id = ?',
                [booking_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error deleting booking: ${error.message}`);
        }
    }

    // Instance methods
    async save() {
        if (this.booking_id) {
            return await Booking.update(this.booking_id, this.toObject());
        } else {
            const result = await Booking.create(this.toObject());
            this.booking_id = result.booking_id;
            return result;
        }
    }

    toObject() {
        return {
            booking_id: this.booking_id,
            user_id: this.user_id,
            room_id: this.room_id,
            start_time: this.start_time,
            end_time: this.end_time,
            status: this.status,
            total_price: this.total_price,
            duration_hours: this.duration_hours,
            payment_status: this.payment_status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Booking;