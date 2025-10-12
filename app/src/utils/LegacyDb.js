/**
 * Legacy Service Wrapper
 * ใช้สำหรับ bridge เชื่อมต่อระหว่าง legacy code กับ modular structure ใหม่
 */

const { promisePool } = require('../config/database');

// Export legacy pool interface for backward compatibility
const legacyPool = {
    query: promisePool.query.bind(promisePool),
    execute: promisePool.execute.bind(promisePool)
};

module.exports = legacyPool;