const { promisePool } = require('../../../core/config/database');

class Room {
    constructor(data) {
        this.room_id = data.room_id;
        this.name = data.name;
        this.type_id = data.type_id;
        this.capacity = data.capacity;
        this.status = data.status;
        this.description = data.description;
        this.features = data.features;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        // Join data from room_types
        this.type_name = data.type_name;
        this.price_per_hour = data.price_per_hour;
    }

    static async findAll({ q, type_id, status, limit = 100 } = {}) {
        try {
            const params = [];
            let sql = `SELECT r.*, rt.type_name, rt.price_per_hour 
                      FROM rooms r 
                      LEFT JOIN room_types rt ON r.type_id = rt.type_id`;
            const where = [];

            if (q) {
                where.push('(r.name LIKE ? OR rt.type_name LIKE ?)');
                params.push('%' + q + '%', '%' + q + '%');
            }

            if (type_id) {
                where.push('r.type_id = ?');
                params.push(type_id);
            }

            if (status) {
                where.push('r.status = ?');
                params.push(status);
            }

            if (where.length) {
                sql += ' WHERE ' + where.join(' AND ');
            }

            sql += ' ORDER BY r.room_id DESC LIMIT ?';
            params.push(limit);

            const [rows] = await promisePool.query(sql, params);
            return rows.map(row => new Room(row));
        } catch (error) {
            throw new Error(`Error finding rooms: ${error.message}`);
        }
    }

    static async findById(room_id) {
        try {
            const [rows] = await promisePool.query(
                'SELECT r.*, rt.type_name, rt.price_per_hour FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ? LIMIT 1', 
                [room_id]
            );
            return rows.length ? new Room(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding room by ID: ${error.message}`);
        }
    }

    static async create({ name, type_id, capacity, status = 'available' }) {
        try {
            const [result] = await promisePool.query(
                'INSERT INTO rooms (name, type_id, capacity, status) VALUES (?,?,?,?)', 
                [name, type_id, capacity, status]
            );
            return await this.findById(result.insertId);
        } catch (error) {
            throw new Error(`Error creating room: ${error.message}`);
        }
    }

    static async update(room_id, updateData) {
        try {
            // Only allow valid columns to be updated
            const validFields = ['name', 'type_id', 'capacity', 'status'];
            const fields = Object.keys(updateData).filter(f => validFields.includes(f));
            const values = fields.map(f => updateData[f]);
            if (fields.length === 0) throw new Error('No valid fields to update');
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const [result] = await promisePool.query(
                `UPDATE rooms SET ${setClause} WHERE room_id = ?`,
                [...values, room_id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating room: ${error.message}`);
        }
    }

    static async delete(room_id) {
        try {
            const [result] = await promisePool.query(
                'DELETE FROM rooms WHERE room_id = ?',
                [room_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error deleting room: ${error.message}`);
        }
    }

    static async getAvailableTimeSlots(room_id, date) {
        try {
            const [bookings] = await promisePool.query(`
                SELECT start_time, end_time 
                FROM bookings 
                WHERE room_id = ? 
                AND DATE(start_time) = ? 
                AND status IN ('active', 'confirmed')
                ORDER BY start_time
            `, [room_id, date]);

            // Generate available time slots (this is a simplified version)
            const availableSlots = [];
            const businessHours = {
                start: 9, // 9 AM
                end: 23   // 11 PM
            };

            for (let hour = businessHours.start; hour < businessHours.end; hour++) {
                const slotStart = `${hour.toString().padStart(2, '0')}:00`;
                const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
                
                // Check if this slot conflicts with any booking
                const hasConflict = bookings.some(booking => {
                    const bookingStart = new Date(booking.start_time).getHours();
                    const bookingEnd = new Date(booking.end_time).getHours();
                    return hour >= bookingStart && hour < bookingEnd;
                });

                if (!hasConflict) {
                    availableSlots.push({ start: slotStart, end: slotEnd });
                }
            }

            return availableSlots;
        } catch (error) {
            throw new Error(`Error getting available time slots: ${error.message}`);
        }
    }

    // Instance methods
    async save() {
        if (this.room_id) {
            return await Room.update(this.room_id, this.toObject());
        } else {
            const result = await Room.create(this.toObject());
            this.room_id = result.room_id;
            return result;
        }
    }

    toObject() {
        return {
            room_id: this.room_id,
            name: this.name,
            type_id: this.type_id,
            capacity: this.capacity,
            status: this.status,
            description: this.description,
            features: this.features,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    toJSON() {
        return {
            ...this.toObject(),
            type_name: this.type_name,
            price_per_hour: this.price_per_hour
        };
    }
}

module.exports = Room;