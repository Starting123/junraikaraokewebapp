#!/usr/bin/env node

/**
 * Development server starter
 * ใช้สำหรับรัน development server ด้วย modular structure
 */

const app = require('../src/app');
const debug = require('debug')('junraikaraokewebapp:server');
const http = require('http');
const config = require('../src/config');
const logger = require('../src/utils/Logger');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || config.server.port);
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => {
  console.log('🎤 Junrai Karaoke Web Application (Modular Version)');
  console.log('='.repeat(60));
  logger.info(`🚀 Server running on port ${port} in ${config.server.env} mode`);
  logger.info(`📊 Health check: http://localhost:${port}/health`);
  logger.info(`📚 API docs: http://localhost:${port}/api`);
  console.log('='.repeat(60));
  console.log('🔗 New API endpoints (v2):');
  console.log(`   Auth: http://localhost:${port}/api/v2/auth`);
  console.log(`   Bookings: http://localhost:${port}/api/v2/bookings`);
  console.log(`   Payments: http://localhost:${port}/api/v2/payments`);
  console.log(`   Rooms: http://localhost:${port}/api/v2/rooms`);
  console.log(`   Users: http://localhost:${port}/api/v2/users`);
  console.log(`   Admin: http://localhost:${port}/api/v2/admin`);
  console.log(`   Orders: http://localhost:${port}/api/v2/orders`);
  console.log('='.repeat(60));
});

server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Graceful shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;