const pool = require('./db');

async function checkBookingPaymentsTable() {
    try {
        const [rows] = await pool.query('DESCRIBE booking_payments');
        console.log('โครงสร้างตาราง booking_payments:');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${row.Key ? `(${row.Key})` : ''} ${row.Default ? `Default: ${row.Default}` : ''}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookingPaymentsTable();