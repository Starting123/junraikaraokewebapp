const { body, param, query } = require('express-validator');
const xss = require('xss');

/**
 * Comprehensive input validation and sanitization middleware
 */

// Common validation rules
const validationRules = {
  // User fields
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(value => xss(value)),
    
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
    
  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores')
    .customSanitizer(value => xss(value.trim().toLowerCase())),
    
  name: body(['first_name', 'last_name', 'name'])
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1-50 characters')
    .matches(/^[\u0E00-\u0E7Fa-zA-Z\s]+$/)
    .withMessage('Name can only contain Thai/English letters and spaces')
    .customSanitizer(value => xss(value.trim())),
    
  phone: body('phone_number', 'phone')
    .optional()
    .matches(/^(\+66|0)[0-9]{8,9}$/)
    .withMessage('Please provide a valid Thai phone number')
    .customSanitizer(value => xss(value ? value.replace(/\s/g, '') : value)),

  // Room fields
  roomName: body('room_name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name is required and must be under 100 characters')
    .customSanitizer(value => xss(value.trim())),
    
  roomType: body('room_type')
    .isIn(['small', 'medium', 'large', 'vip'])
    .withMessage('Room type must be: small, medium, large, or vip'),
    
  capacity: body('capacity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Capacity must be between 1-50 people')
    .toInt(),
    
  hourlyRate: body('hourly_rate')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
    .toFloat(),

  // Booking fields
  bookingDate: body('booking_date')
    .isISO8601()
    .withMessage('Please provide a valid booking date')
    .toDate(),
    
  startTime: body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
    
  endTime: body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),

  // Payment fields
  amount: body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
    
  paymentMethod: body('payment_method')
    .isIn(['stripe', 'slip', 'cash'])
    .withMessage('Payment method must be: stripe, slip, or cash'),

  // ID parameters
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID')
    .toInt(),

  // Query parameters
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100')
    .toInt(),
    
  search: query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term too long')
    .customSanitizer(value => value ? xss(value.trim()) : value)
};

// Validation rule combinations for different endpoints
const validationSets = {
  // Authentication
  register: [
    validationRules.name,
    validationRules.email,
    validationRules.username,
    validationRules.password,
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],

  forgotPassword: [
    validationRules.email
  ],

  resetPassword: [
    validationRules.password,
    body('token').isLength({ min: 32, max: 255 }).withMessage('Invalid reset token'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],

  // Rooms
  createRoom: [
    validationRules.roomName,
    validationRules.roomType,
    validationRules.capacity,
    validationRules.hourlyRate,
    body('status').isIn(['available', 'maintenance', 'booked']).withMessage('Invalid status')
  ],

  updateRoom: [
    validationRules.id,
    validationRules.roomName,
    validationRules.roomType,
    validationRules.capacity,
    validationRules.hourlyRate
  ],

  // Bookings
  createBooking: [
    validationRules.bookingDate,
    validationRules.startTime,
    validationRules.endTime,
    body('room_id').isInt({ min: 1 }).withMessage('Valid room ID required').toInt(),
    body('duration').isFloat({ min: 0.5 }).withMessage('Duration must be at least 0.5 hours').toFloat()
  ],

  // Payments
  processPayment: [
    validationRules.amount,
    validationRules.paymentMethod,
    body('booking_id').isInt({ min: 1 }).withMessage('Valid booking ID required').toInt()
  ],

  // Admin operations
  createUser: [
    validationRules.name,
    validationRules.email,
    validationRules.username,
    validationRules.password,
    validationRules.phone,
    body('role_id').isInt({ min: 0, max: 10 }).withMessage('Invalid role ID').toInt(),
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
  ],

  updateUser: [
    validationRules.id,
    body('first_name').optional().isLength({ min: 1, max: 50 }).customSanitizer(value => xss(value)),
    body('last_name').optional().isLength({ min: 1, max: 50 }).customSanitizer(value => xss(value)),
    body('email').optional().isEmail().normalizeEmail(),
    validationRules.phone
  ],

  // Pagination and search
  pagination: [
    validationRules.page,
    validationRules.limit,
    validationRules.search
  ],

  // Generic ID validation
  idParam: [validationRules.id]
};

/**
 * Custom sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key].trim());
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

/**
 * File upload validation
 */
const fileValidation = {
  image: {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP allowed.'));
      }
    }
  },

  document: {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, JPEG and PNG allowed.'));
      }
    }
  }
};

/**
 * SQL injection prevention helper
 */
const escapeSql = (value) => {
  if (typeof value === 'string') {
    return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"":
        case "'":
        case "\\":
        case "%": return "\\" + char;
        default: return char;
      }
    });
  }
  return value;
};

module.exports = {
  validationRules,
  validationSets,
  sanitizeInput,
  fileValidation,
  escapeSql
};