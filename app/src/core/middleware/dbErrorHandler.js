/**
 * Global error handler for database errors
 */
const DbError = require('../utils/DbError');
const logger = require('../utils/Logger');

function handleDbError(err, req, res, next) {
    if (err.code === 'ECONNREFUSED') {
        logger.error('Database connection failed:', err);
        return res.status(503).json({
            success: false,
            message: 'Database connection failed'
        });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Record already exists'
        });
    }

    if (err.code === 'ER_NO_SUCH_TABLE') {
        logger.error('Table not found:', err);
        return res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }

    next(err);
}

module.exports = handleDbError;