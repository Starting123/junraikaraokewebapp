var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var cors = require('cors');
var compression = require('compression');
var rateLimit = require('express-rate-limit');
var winston = require('winston');
var xss = require('xss-clean');
var mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

// Initialize Winston logger
const appLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'junrai-karaoke' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/api/users');
const roomsRouter = require('./routes/api/rooms');
var apiAuth = require('./routes/api/auth');
var apiBookings = require('./routes/api/bookings');
var apiAdmin = require('./routes/api/admin');
var apiOrders = require('./routes/api/orders');
const paymentRouter = require('./routes/payment');

var app = express();

// Production optimizations
const ProductionConfig = require('./config/production');
const productionConfig = new ProductionConfig(app);
productionConfig.init();

// Trust proxy for accurate client IP (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://js.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression middleware
app.use(compression());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// XSS protection
app.use(xss());

// NoSQL injection prevention
app.use(mongoSanitize());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('combined', {
  stream: {
    write: (message) => appLogger.info(message.trim())
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/auth', apiAuth);
app.use('/api/bookings', apiBookings);
app.use('/api/admin', apiAdmin);
app.use('/api/orders', apiOrders);
app.use('/api/payments', require('./routes/api/payments'));
app.use('/payment', paymentRouter);
app.use('/admin', require('./routes/admin'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = createError(404);
  appLogger.warn(`404 - ${req.method} ${req.url} - IP: ${req.ip}`);
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // Log all errors
  appLogger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Don't leak error details in production
  if (req.app.get('env') !== 'development') {
    res.locals.message = err.status === 404 ? 'Page not found' : 'Something went wrong';
    res.locals.error = {};
  }

  // render the error page
  res.status(err.status || 500);
  
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    res.json({
      success: false,
      error: res.locals.message,
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    });
  } else {
    res.render('error');
  }
});

// Make logger available globally
app.locals.logger = appLogger;
global.logger = appLogger;

module.exports = app;
