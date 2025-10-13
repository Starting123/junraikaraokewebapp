var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

// Legacy routes (migrated to src/routes/legacy)
const indexRouter = require('./src/routes/legacy/index');
const usersRouter = require('./src/routes/legacy/api/users');
const roomsRouter = require('./src/routes/legacy/api/rooms');
var apiAuth = require('./src/routes/legacy/api/auth');
var apiBookings = require('./src/routes/legacy/api/bookings');
var apiAdmin = require('./src/routes/legacy/api/admin');
var apiOrders = require('./src/routes/legacy/api/orders');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static file serving - new modular structure
app.use('/css', express.static(path.join(__dirname, 'src/public/css')));
app.use('/js', express.static(path.join(__dirname, 'src/public/js')));
app.use('/receipts', express.static(path.join(__dirname, 'public/receipts')));

// Keep original structure for backward compatibility
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/auth', apiAuth);
app.use('/api/bookings', apiBookings);
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/orders', apiOrders);
app.use('/api/payments', require('./src/routes/legacy/api/payments'));
app.use('/api/legacy/payments', require('./src/routes/legacy/api/payments'));
app.use('/api/receipts', require('./src/routes/legacy/api/receipts'));

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

module.exports = app;
