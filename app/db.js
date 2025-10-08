const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'junraikaraokedatabase',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '20', 10),
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Security and performance options
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  timezone: '+07:00', // Thailand timezone
  charset: 'utf8mb4',
  // Connection validation
  reconnect: true,
  maxReconnects: 3,
  reconnectDelay: 2000
});

// Test connection and log status
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    if (global.logger) {
      global.logger.info('Database connection established');
    }
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    if (global.logger) {
      global.logger.error('Database connection failed:', err);
    }
  });

// Handle pool events
pool.on('connection', function (connection) {
  console.log('New connection established as id ' + connection.threadId);
});

pool.on('error', function(err) {
  console.error('Database pool error:', err);
  if (global.logger) {
    global.logger.error('Database pool error:', err);
  }
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect...');
  } else {
    throw err;
  }
});

module.exports = pool;
