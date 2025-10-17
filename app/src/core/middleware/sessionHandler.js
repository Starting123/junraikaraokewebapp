/**
 * ==========================================
 * SESSION HANDLER
 * ==========================================
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('./errorHandler');

class SessionHandler {
    static initSession(req, res, next) {
        // Extract token from Authorization header or cookie
        const token = req.cookies?.token || 
                     req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return next();
        }

        try {
            // Verify and decode token
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = decoded;
            
            // Attach user info to locals for views
            res.locals.user = decoded;
            
            // Check token expiration
            const tokenExp = new Date(decoded.exp * 1000);
            const now = new Date();
            
            // If token is close to expiry (within 5 minutes), set refresh header
            if ((tokenExp - now) < 300000 && !res.headersSent && !res.finished) { // 5 minutes
                res.set('X-Token-Refresh', 'needed');
            }

            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                // Clear expired token
                res.clearCookie('token');
            }
            next();
        }
    }

    static async requireAuth(req, res, next) {
        if (!req.user) {
            const isApiRequest = req.path.startsWith('/api') || 
                               req.xhr || 
                               req.headers.accept?.includes('application/json');

            if (isApiRequest) {
                throw new ApiError(401, 'กรุณาเข้าสู่ระบบ');
            } else {
                return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
            }
        }
        next();
    }

    static requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                throw new ApiError(401, 'กรุณาเข้าสู่ระบบ');
            }

            if (!roles.includes(req.user.role_id)) {
                throw new ApiError(403, 'ไม่มีสิทธิ์เข้าถึง');
            }

            next();
        };
    }
}

module.exports = SessionHandler;