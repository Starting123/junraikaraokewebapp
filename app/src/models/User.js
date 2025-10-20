const { promisePool } = require('../config/database');

class User {
    // OTP-based password reset methods
    static async setResetOTP(user_id, otp, expires) {
        // Convert Date to MySQL DATETIME format in UTC
        const expiresUTC = expires.toISOString().slice(0, 19).replace('T', ' ');
        
        await promisePool.query(
            'UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE user_id = ?',
            [otp, expiresUTC, user_id]
        );
    }

    static async findByResetOTP(otp) {
        const [rows] = await promisePool.query(
            'SELECT * FROM users WHERE reset_otp = ? LIMIT 1', [otp]
        );
        return rows.length ? new User(rows[0]) : null;
    }

    static async updatePassword(user_id, hash) {
        await promisePool.query(
            'UPDATE users SET password = ? WHERE user_id = ?', [hash, user_id]
        );
    }

    static async clearResetOTP(user_id) {
        await promisePool.query(
            'UPDATE users SET reset_otp = NULL, reset_otp_expires = NULL WHERE user_id = ?', [user_id]
        );
    }
    
    // Legacy token methods (can be removed if not needed)
    static async setResetToken(user_id, token, expires) {
        await promisePool.query(
            'UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE user_id = ?',
            [token, expires, user_id]
        );
    }

    static async findByResetToken(token) {
        const [rows] = await promisePool.query(
            'SELECT * FROM users WHERE reset_otp = ? LIMIT 1', [token]
        );
        return rows.length ? new User(rows[0]) : null;
    }

    static async clearResetToken(user_id) {
        await promisePool.query(
            'UPDATE users SET reset_otp = NULL, reset_otp_expires = NULL WHERE user_id = ?', [user_id]
        );
    }
    constructor(data) {
        this.user_id = data.user_id;
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.role_id = data.role_id;
        this.status = data.status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.reset_otp = data.reset_otp;
        this.reset_otp_expires = data.reset_otp_expires;
    }

    // Static methods for database operations
    static async findById(user_id) {
        try {
            const [rows] = await promisePool.query(
                'SELECT user_id, name, email, role_id, status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', 
                [user_id]
            );
            return rows.length ? new User(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error.message}`);
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await promisePool.query(
                'SELECT user_id, name, email, password, role_id, status FROM users WHERE email = ? LIMIT 1', 
                [email]
            );
            return rows.length ? new User(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }

    static async create({ name, email, passwordHash, role_id = 3 }) {
        try {
            const [result] = await promisePool.query(
                'INSERT INTO users (name, email, password, role_id) VALUES (?,?,?,?)', 
                [name, email, passwordHash, role_id]
            );
            return { insertId: result.insertId };
        } catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    static async update(user_id, updateData) {
        try {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const [result] = await promisePool.query(
                `UPDATE users SET ${setClause} WHERE user_id = ?`,
                [...values, user_id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    static async delete(user_id) {
        try {
            const [result] = await promisePool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }

    static async findAll(limit = 50, offset = 0) {
        try {
            const [rows] = await promisePool.query(
                'SELECT user_id, name, email, role_id, status, created_at, updated_at FROM users LIMIT ? OFFSET ?',
                [limit, offset]
            );
            return rows.map(row => new User(row));
        } catch (error) {
            throw new Error(`Error finding all users: ${error.message}`);
        }
    }

    // Instance methods
    async save() {
        if (this.user_id) {
            return await User.update(this.user_id, this.toObject());
        } else {
            const result = await User.create(this.toObject());
            this.user_id = result.insertId;
            return result;
        }
    }

    toObject() {
        return {
            user_id: this.user_id,
            name: this.name,
            email: this.email,
            password: this.password,
            role_id: this.role_id,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    toJSON() {
        const { password, ...userWithoutPassword } = this.toObject();
        return userWithoutPassword;
    }
}

module.exports = User;