/**
 * ==========================================
 * API ERROR HANDLER
 * ==========================================
 */

const Logger = require('../utils/Logger');

class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

function errorHandler(err, req, res, next) {
    Logger.error(`[Error] ${err.message}`, {
        path: req.path,
        method: req.method,
        error: err
    });

    // API Error handling
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            details: err.details
        });
    }

    // Auth errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'โทเค็นไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'เซสชั่นหมดอายุ กรุณาเข้าสู่ระบบใหม่'
        });
    }

    // Database errors
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            success: false,
            message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
        });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'ข้อมูลซ้ำ กรุณาตรวจสอบและลองใหม่'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            errors: err.errors
        });
    }

    // Default error response
    return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง'
    });
}

module.exports = {
    ApiError,
    errorHandler
};