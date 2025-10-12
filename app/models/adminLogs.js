// Admin Logs model for tracking administrative activities

const db = require('../db');

class AdminLogsModel {
    // Get all admin logs with filters and pagination
    static async getAll(filters = {}, pagination = {}) {
        let query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name,
                u.email as admin_email
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        // Apply filters
        if (filters.admin_id) {
            query += ' AND al.admin_id = ?';
            queryParams.push(filters.admin_id);
        }
        
        if (filters.action) {
            query += ' AND al.action = ?';
            queryParams.push(filters.action);
        }
        
        if (filters.target_type) {
            query += ' AND al.target_type = ?';
            queryParams.push(filters.target_type);
        }
        
        if (filters.date_from) {
            query += ' AND DATE(al.created_at) >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND DATE(al.created_at) <= ?';
            queryParams.push(filters.date_to);
        }
        
        if (filters.search) {
            query += ' AND (al.action LIKE ? OR al.details LIKE ? OR u.name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Order by
        const orderBy = filters.sort || 'al.created_at';
        const orderDirection = filters.order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${orderBy} ${orderDirection}`;
        
        // Pagination
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 20;
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
            logs: rows
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
    
    // Get log by ID
    static async getById(logId) {
        const query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name,
                u.email as admin_email
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE al.log_id = ?
        `;
        
        const [rows] = await db.query(query, [logId]);
        return rows[0] || null;
    }
    
    // Create new admin log entry
    static async create(logData) {
        const { admin_id, action, target_type, target_id, details, ip_address, user_agent } = logData;
        
        const insertQuery = `
            INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(insertQuery, [
            admin_id, action, target_type, target_id, details, ip_address, user_agent
        ]);
        
        return await this.getById(result.insertId);
    }
    
    // Log user management actions
    static async logUserAction(adminId, action, userId, details = null, req = null) {
        const logData = {
            admin_id: adminId,
            action: action,
            target_type: 'user',
            target_id: userId,
            details: details,
            ip_address: req ? req.ip : null,
            user_agent: req ? req.get('User-Agent') : null
        };
        
        return await this.create(logData);
    }
    
    // Log room management actions
    static async logRoomAction(adminId, action, roomId, details = null, req = null) {
        const logData = {
            admin_id: adminId,
            action: action,
            target_type: 'room',
            target_id: roomId,
            details: details,
            ip_address: req ? req.ip : null,
            user_agent: req ? req.get('User-Agent') : null
        };
        
        return await this.create(logData);
    }
    
    // Log booking management actions
    static async logBookingAction(adminId, action, bookingId, details = null, req = null) {
        const logData = {
            admin_id: adminId,
            action: action,
            target_type: 'booking',
            target_id: bookingId,
            details: details,
            ip_address: req ? req.ip : null,
            user_agent: req ? req.get('User-Agent') : null
        };
        
        return await this.create(logData);
    }
    
    // Log system actions
    static async logSystemAction(adminId, action, details = null, req = null) {
        const logData = {
            admin_id: adminId,
            action: action,
            target_type: 'system',
            target_id: null,
            details: details,
            ip_address: req ? req.ip : null,
            user_agent: req ? req.get('User-Agent') : null
        };
        
        return await this.create(logData);
    }
    
    // Get logs by admin ID
    static async getByAdminId(adminId, limit = 50) {
        const query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at
            FROM admin_logs al
            WHERE al.admin_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [adminId, limit]);
        return rows;
    }
    
    // Get logs by action type
    static async getByAction(action, limit = 100) {
        const query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE al.action = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [action, limit]);
        return rows;
    }
    
    // Get recent logs
    static async getRecent(limit = 20) {
        const query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name,
                u.email as admin_email
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            ORDER BY al.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [limit]);
        return rows;
    }
    
    // Get log statistics
    static async getStats(filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as total_logs,
                COUNT(DISTINCT al.admin_id) as active_admins,
                COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as logs_today,
                COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as logs_week,
                COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as logs_month
            FROM admin_logs al
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (filters.date_from) {
            query += ' AND DATE(al.created_at) >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND DATE(al.created_at) <= ?';
            queryParams.push(filters.date_to);
        }
        
        const [rows] = await db.query(query, queryParams);
        return rows[0];
    }
    
    // Get action breakdown statistics
    static async getActionStats(days = 30) {
        const query = `
            SELECT 
                al.action,
                COUNT(*) as count,
                COUNT(DISTINCT al.admin_id) as admin_count
            FROM admin_logs al
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY al.action
            ORDER BY count DESC
        `;
        
        const [rows] = await db.query(query, [days]);
        return rows;
    }
    
    // Get admin activity stats
    static async getAdminActivityStats(days = 30) {
        const query = `
            SELECT 
                u.user_id,
                u.name as admin_name,
                u.email as admin_email,
                COUNT(al.log_id) as activity_count,
                MAX(al.created_at) as last_activity
            FROM users u
            LEFT JOIN admin_logs al ON u.user_id = al.admin_id 
                AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            WHERE u.role_id = 1 AND u.status = 'active'
            GROUP BY u.user_id
            ORDER BY activity_count DESC
        `;
        
        const [rows] = await db.query(query, [days]);
        return rows;
    }
    
    // Clean old logs (keep only last N days)
    static async cleanOldLogs(daysToKeep = 90) {
        const query = 'DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
        const [result] = await db.query(query, [daysToKeep]);
        
        return {
            deleted_logs: result.affectedRows,
            kept_days: daysToKeep
        };
    }
    
    // Search logs
    static async search(searchTerm, filters = {}) {
        let query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name,
                u.email as admin_email
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE (
                al.action LIKE ? OR 
                al.details LIKE ? OR 
                u.name LIKE ? OR
                al.ip_address LIKE ?
            )
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
        
        // Apply additional filters
        if (filters.admin_id) {
            query += ' AND al.admin_id = ?';
            queryParams.push(filters.admin_id);
        }
        
        if (filters.action) {
            query += ' AND al.action = ?';
            queryParams.push(filters.action);
        }
        
        if (filters.target_type) {
            query += ' AND al.target_type = ?';
            queryParams.push(filters.target_type);
        }
        
        query += ' ORDER BY al.created_at DESC LIMIT 100';
        
        const [rows] = await db.query(query, queryParams);
        return rows;
    }
    
    // Get logs for a specific target
    static async getByTarget(targetType, targetId, limit = 20) {
        const query = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.action,
                al.target_type,
                al.target_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name as admin_name
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE al.target_type = ? AND al.target_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [targetType, targetId, limit]);
        return rows;
    }
    
    // Create the admin_logs table if it doesn't exist
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS admin_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id INT,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_id (admin_id),
                INDEX idx_action (action),
                INDEX idx_target (target_type, target_id),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `;
        
        await db.query(query);
        return { table_created: true };
    }
}

module.exports = AdminLogsModel;