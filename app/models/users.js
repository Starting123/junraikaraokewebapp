// Users model for database operations

const db = require('../db');
const bcrypt = require('bcryptjs');

class UsersModel {
    // Get all users with filters and pagination
    static async getAll(filters = {}, pagination = {}) {
        let query = `
            SELECT 
                u.user_id,
                u.firstname,
                u.lastname,
                u.name,
                u.email,
                u.phone,
                u.role_id,
                u.status,
                u.created_at,
                u.updated_at,
                r.role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        // Apply filters
        if (filters.role_id) {
            query += ' AND u.role_id = ?';
            queryParams.push(filters.role_id);
        }
        
        if (filters.status) {
            query += ' AND u.status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.search) {
            query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.firstname LIKE ? OR u.lastname LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        // Order by
        const orderBy = filters.sort || 'u.created_at';
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
        
        // Add limit and offset for pagination
        if (pagination.page && pagination.limit) {
            query += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);
        }
        
        const [rows] = await db.query(query, queryParams);
        
        // Remove password from results
        const users = rows.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        
        const result = {
            users: users
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
    
    // Get user by ID
    static async getById(userId) {
        const query = `
            SELECT 
                u.user_id,
                u.firstname,
                u.lastname,
                u.name,
                u.email,
                u.phone,
                u.role_id,
                u.status,
                u.created_at,
                u.updated_at,
                r.role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = ?
        `;
        
        const [rows] = await db.query(query, [userId]);
        const user = rows[0] || null;
        
        if (user) {
            // Remove password from result
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        
        return null;
    }
    
    // Get user by email (for authentication)
    static async getByEmail(email, includePassword = false) {
        let query = `
            SELECT 
                u.user_id,
                u.firstname,
                u.lastname,
                u.name,
                u.email,
                u.phone,
                u.role_id,
                u.status,
                u.created_at,
                u.updated_at
        `;
        
        // Include password only when specifically requested (for authentication)
        if (includePassword) {
            query += ', u.password';
        }
        
        query += `
            FROM users u
            WHERE u.email = ? AND u.status = 'active'
        `;
        
        const [rows] = await db.query(query, [email]);
        return rows[0] || null;
    }
    
    // Create new user
    static async create(userData) {
        const { firstname, lastname, name, email, phone, password, role_id = 3 } = userData;
        
        // Check if email already exists
        const existingUser = await this.getByEmail(email);
        if (existingUser) {
            throw new Error('Email already exists');
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const insertQuery = `
            INSERT INTO users (firstname, lastname, name, email, phone, password, role_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `;
        
        const [result] = await db.query(insertQuery, [
            firstname, lastname, name, email, phone, hashedPassword, role_id
        ]);
        
        return await this.getById(result.insertId);
    }
    
    // Update user
    static async update(userId, updateData) {
        const allowedFields = ['firstname', 'lastname', 'name', 'email', 'phone', 'role_id', 'status'];
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
        
        // If updating email, check for duplicates
        if (updateData.email) {
            const existingUser = await this.getByEmail(updateData.email);
            if (existingUser && existingUser.user_id !== parseInt(userId)) {
                throw new Error('Email already exists');
            }
        }
        
        // Add updated_at timestamp
        updates.push('updated_at = NOW()');
        values.push(userId);
        
        const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
        
        const [result] = await db.query(query, values);
        
        if (result.affectedRows === 0) {
            throw new Error('User not found or no changes made');
        }
        
        return await this.getById(userId);
    }
    
    // Update password
    static async updatePassword(userId, newPassword) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        const query = 'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?';
        const [result] = await db.query(query, [hashedPassword, userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('User not found');
        }
        
        return { success: true, message: 'Password updated successfully' };
    }
    
    // Verify password
    static async verifyPassword(email, password) {
        const user = await this.getByEmail(email, true);
        
        if (!user) {
            return null;
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return null;
        }
        
        // Remove password from returned user object
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    
    // Delete user (soft delete by setting status to inactive)
    static async delete(userId) {
        // Check if user has active bookings
        const bookingQuery = `
            SELECT booking_id 
            FROM bookings 
            WHERE user_id = ? AND status = 'active' AND start_time > NOW()
        `;
        const [bookingRows] = await db.query(bookingQuery, [userId]);
        
        if (bookingRows.length > 0) {
            throw new Error('Cannot delete user with active future bookings');
        }
        
        const query = 'UPDATE users SET status = "inactive", updated_at = NOW() WHERE user_id = ?';
        const [result] = await db.query(query, [userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('User not found');
        }
        
        return { deleted: true, user_id: userId };
    }
    
    // Hard delete user (admin only, for testing purposes)
    static async hardDelete(userId) {
        const query = 'DELETE FROM users WHERE user_id = ?';
        const [result] = await db.query(query, [userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('User not found');
        }
        
        return { deleted: true, user_id: userId };
    }
    
    // Get user statistics
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
                COUNT(CASE WHEN role_id = 1 THEN 1 END) as admin_users,
                COUNT(CASE WHEN role_id = 2 THEN 1 END) as staff_users,
                COUNT(CASE WHEN role_id = 3 THEN 1 END) as customer_users,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
            FROM users
        `;
        
        const [rows] = await db.query(query);
        return rows[0];
    }
    
    // Get user's booking statistics
    static async getUserBookingStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COUNT(CASE WHEN start_time > NOW() THEN 1 END) as upcoming_bookings
            FROM bookings
            WHERE user_id = ?
        `;
        
        const [rows] = await db.query(query, [userId]);
        return rows[0];
    }
    
    // Search users
    static async search(searchTerm, filters = {}) {
        let query = `
            SELECT 
                u.user_id,
                u.firstname,
                u.lastname,
                u.name,
                u.email,
                u.phone,
                u.role_id,
                u.status,
                u.created_at,
                r.role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE (
                u.name LIKE ? OR 
                u.email LIKE ? OR 
                u.firstname LIKE ? OR 
                u.lastname LIKE ? OR
                u.phone LIKE ?
            )
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const queryParams = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
        
        // Apply additional filters
        if (filters.role_id) {
            query += ' AND u.role_id = ?';
            queryParams.push(filters.role_id);
        }
        
        if (filters.status) {
            query += ' AND u.status = ?';
            queryParams.push(filters.status);
        }
        
        query += ' ORDER BY u.name ASC LIMIT 20';
        
        const [rows] = await db.query(query, queryParams);
        return rows;
    }
    
    // Get user roles
    static async getRoles() {
        const query = `
            SELECT 
                r.role_id,
                r.role_name,
                COUNT(u.user_id) as user_count
            FROM roles r
            LEFT JOIN users u ON r.role_id = u.role_id AND u.status = 'active'
            GROUP BY r.role_id
            ORDER BY r.role_id ASC
        `;
        
        const [rows] = await db.query(query);
        return rows;
    }
    
    // Update user status
    static async updateStatus(userId, status) {
        const validStatuses = ['active', 'inactive'];
        
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status. Must be: active, inactive');
        }
        
        const query = 'UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?';
        const [result] = await db.query(query, [status, userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('User not found');
        }
        
        return await this.getById(userId);
    }
    
    // Get recent users
    static async getRecent(limit = 10) {
        const query = `
            SELECT 
                u.user_id,
                u.firstname,
                u.lastname,
                u.name,
                u.email,
                u.phone,
                u.role_id,
                u.status,
                u.created_at,
                r.role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.status = 'active'
            ORDER BY u.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [limit]);
        return rows;
    }
    
    // Check if user exists by email
    static async existsByEmail(email) {
        const query = 'SELECT user_id FROM users WHERE email = ?';
        const [rows] = await db.query(query, [email]);
        return rows.length > 0;
    }
    
    // Get user profile with additional data
    static async getProfile(userId) {
        const user = await this.getById(userId);
        if (!user) {
            return null;
        }
        
        const bookingStats = await this.getUserBookingStats(userId);
        
        return {
            ...user,
            booking_stats: bookingStats
        };
    }
}

module.exports = UsersModel;