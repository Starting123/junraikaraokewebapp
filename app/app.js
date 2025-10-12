
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var cors = require('cors');
var session = require('express-session');
var csrf = require('csurf');
var expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/api/users');
const roomsRouter = require('./routes/api/rooms');
var apiAuth = require('./routes/api/auth');
var apiBookings = require('./routes/api/bookings');
var apiAdmin = require('./routes/api/admin');
var apiOrders = require('./routes/api/orders');


var app = express();

// Enforce SESSION_SECRET environment variable
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET environment variable is required and must be at least 32 characters');
}

// Session management with enhanced security
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'karaoke-session', // Don't use default session name
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'strict' // CSRF protection
  }
}));

// Health check route
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV });
});

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "js.stripe.com", "cdnjs.cloudflare.com"],
      'script-src-attr': ["'unsafe-inline'"], // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "*.stripe.com"],
      connectSrc: ["'self'", "api.stripe.com"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Enhanced CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Layout configuration
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

app.use(logger('dev'));

// Critical: Body parser middleware MUST be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Changed to true for nested objects
app.use(cookieParser());

// CSRF Protection setup (will be applied later)
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Make session user available to all templates (server-side rendering)
app.use((req, res, next) => {
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/auth', apiAuth);
app.use('/api/bookings', apiBookings);
app.use('/api/admin', apiAdmin);
app.use('/api/orders', apiOrders);
app.use('/api/payments', require('./routes/api/payments'));

// Apply CSRF protection to web routes (exclude API routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next(); // Skip CSRF for API routes
  }
  csrfProtection(req, res, next);
});

// Make CSRF token available to templates  
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    try {
      res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
    } catch (e) {
      res.locals.csrfToken = null;
    }
  }
  next();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
