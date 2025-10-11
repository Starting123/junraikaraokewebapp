/**
 * ==========================================
 * Validation Middleware
 * Centralized validation rules for all endpoints
 * ==========================================
 */

const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('./apiResponse');

/**
 * Handle validation errors
 */
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors);
    }
    next();
};

/**
 * Authentication validators
 */
const authValidators = {
    register: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email address is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        handleValidation
    ],

    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email address is required'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidation
    ],

    changePassword: [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
        handleValidation
    ],

    resetPassword: [
        body('token')
            .notEmpty()
            .withMessage('Reset token is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
        handleValidation
    ],

    updateProfile: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('phone')
            .optional()
            .matches(/^[0-9]{9,10}$/)
            .withMessage('Phone number must be 9-10 digits'),
        body('address')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Address must not exceed 500 characters'),
        handleValidation
    ]
};

/**
 * Booking validators
 */
const bookingValidators = {
    create: [
        body('room_id')
            .isInt({ gt: 0 })
            .withMessage('Valid room ID is required'),
        body('start_time')
            .isISO8601()
            .withMessage('Valid start time (ISO8601 format) is required'),
        body('end_time')
            .isISO8601()
            .withMessage('Valid end time (ISO8601 format) is required'),
        body('duration_hours')
            .optional()
            .isInt({ min: 1, max: 24 })
            .withMessage('Duration must be between 1 and 24 hours'),
        body('customer_id')
            .optional()
            .isInt({ gt: 0 })
            .withMessage('Valid customer ID is required'),
        handleValidation
    ],

    updateStatus: [
        param('id')
            .isInt({ gt: 0 })
            .withMessage('Valid booking ID is required'),
        body('status')
            .isIn(['active', 'cancelled', 'completed'])
            .withMessage('Status must be active, cancelled, or completed'),
        handleValidation
    ],

    updatePaymentStatus: [
        param('id')
            .isInt({ gt: 0 })
            .withMessage('Valid booking ID is required'),
        body('payment_status')
            .isIn(['pending', 'paid', 'failed'])
            .withMessage('Payment status must be pending, paid, or failed'),
        handleValidation
    ],

    getBookings: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('room_id')
            .optional()
            .isInt({ gt: 0 })
            .withMessage('Room ID must be a positive integer'),
        query('customer_id')
            .optional()
            .isInt({ gt: 0 })
            .withMessage('Customer ID must be a positive integer'),
        handleValidation
    ]
};

/**
 * Room validators
 */
const roomValidators = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Room name is required and must not exceed 100 characters'),
        body('type_id')
            .isInt({ gt: 0 })
            .withMessage('Valid room type ID is required'),
        body('capacity')
            .isInt({ min: 1, max: 100 })
            .withMessage('Capacity must be between 1 and 100'),
        body('status')
            .optional()
            .isIn(['available', 'maintenance', 'occupied'])
            .withMessage('Status must be available, maintenance, or occupied'),
        handleValidation
    ],

    update: [
        param('id')
            .isInt({ gt: 0 })
            .withMessage('Valid room ID is required'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Room name must not exceed 100 characters'),
        body('type_id')
            .optional()
            .isInt({ gt: 0 })
            .withMessage('Valid room type ID is required'),
        body('capacity')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Capacity must be between 1 and 100'),
        body('status')
            .optional()
            .isIn(['available', 'maintenance', 'occupied'])
            .withMessage('Status must be available, maintenance, or occupied'),
        handleValidation
    ]
};

/**
 * Admin validators
 */
const adminValidators = {
    createUser: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email address is required'),
        body('role_id')
            .isInt({ min: 1, max: 2 })
            .withMessage('Role ID must be 1 (admin) or 2 (customer)'),
        handleValidation
    ],

    updateUser: [
        param('id')
            .isInt({ gt: 0 })
            .withMessage('Valid user ID is required'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .optional()
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email address is required'),
        body('status')
            .optional()
            .isIn(['active', 'inactive'])
            .withMessage('Status must be active or inactive'),
        body('role_id')
            .optional()
            .isInt({ min: 1, max: 2 })
            .withMessage('Role ID must be 1 (admin) or 2 (customer)'),
        handleValidation
    ],

    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        handleValidation
    ]
};

/**
 * Common parameter validators
 */
const paramValidators = {
    id: [
        param('id')
            .isInt({ gt: 0 })
            .withMessage('Valid ID is required'),
        handleValidation
    ]
};

module.exports = {
    handleValidation,
    authValidators,
    bookingValidators,
    roomValidators,
    adminValidators,
    paramValidators
};