const { promisePool } = require('../config/database');

class Order {
    constructor(data) {
        this.order_id = data.order_id;
        this.booking_id = data.booking_id;
        this.user_id = data.user_id;
        this.total_amount = data.total_amount;
        this.status = data.status;
        this.payment_method = data.payment_method;
        this.stripe_payment_intent_id = data.stripe_payment_intent_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async create(orderData) {
        try {
            const { booking_id, user_id, total_amount, payment_method = 'stripe', status = 'pending' } = orderData;
            
            const [result] = await promisePool.query(
                'INSERT INTO orders (booking_id, user_id, total_amount, status, payment_method) VALUES (?,?,?,?,?)',
                [booking_id, user_id, total_amount, status, payment_method]
            );

            return await this.findById(result.insertId);
        } catch (error) {
            throw new Error(`Error creating order: ${error.message}`);
        }
    }

    static async findById(order_id) {
        try {
            const [rows] = await promisePool.query(`
                SELECT o.*, b.room_id, b.start_time, b.end_time, 
                       r.name as room_name, u.name as user_name, u.email
                FROM orders o
                LEFT JOIN bookings b ON o.booking_id = b.booking_id
                LEFT JOIN rooms r ON b.room_id = r.room_id
                LEFT JOIN users u ON o.user_id = u.user_id
                WHERE o.order_id = ? LIMIT 1
            `, [order_id]);
            return rows.length ? new Order(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding order by ID: ${error.message}`);
        }
    }

    static async findByStripePaymentIntent(stripe_payment_intent_id) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1',
                [stripe_payment_intent_id]
            );
            return rows.length ? new Order(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding order by Stripe payment intent: ${error.message}`);
        }
    }

    static async findAll({ user_id, status, limit = 100, offset = 0 } = {}) {
        try {
            const params = [];
            let sql = `
                SELECT o.*, b.room_id, b.start_time, b.end_time, 
                       r.name as room_name, u.name as user_name, u.email
                FROM orders o
                LEFT JOIN bookings b ON o.booking_id = b.booking_id
                LEFT JOIN rooms r ON b.room_id = r.room_id
                LEFT JOIN users u ON o.user_id = u.user_id
            `;
            const where = [];

            if (user_id) {
                where.push('o.user_id = ?');
                params.push(user_id);
            }

            if (status) {
                where.push('o.status = ?');
                params.push(status);
            }

            if (where.length > 0) {
                sql += ' WHERE ' + where.join(' AND ');
            }

            sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await promisePool.query(sql, params);
            return rows.map(row => new Order(row));
        } catch (error) {
            throw new Error(`Error finding orders: ${error.message}`);
        }
    }

    static async update(order_id, updateData) {
        try {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const [result] = await promisePool.query(
                `UPDATE orders SET ${setClause} WHERE order_id = ?`,
                [...values, order_id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating order: ${error.message}`);
        }
    }

    static async updateByStripePaymentIntent(stripe_payment_intent_id, updateData) {
        try {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const [result] = await promisePool.query(
                `UPDATE orders SET ${setClause} WHERE stripe_payment_intent_id = ?`,
                [...values, stripe_payment_intent_id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating order by Stripe payment intent: ${error.message}`);
        }
    }

    // Instance methods
    async save() {
        if (this.order_id) {
            return await Order.update(this.order_id, this.toObject());
        } else {
            const result = await Order.create(this.toObject());
            this.order_id = result.order_id;
            return result;
        }
    }

    toObject() {
        return {
            order_id: this.order_id,
            booking_id: this.booking_id,
            user_id: this.user_id,
            total_amount: this.total_amount,
            status: this.status,
            payment_method: this.payment_method,
            stripe_payment_intent_id: this.stripe_payment_intent_id,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Order;