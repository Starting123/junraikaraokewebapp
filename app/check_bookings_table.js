const pool = require('./db');

async function checkBookingsTable() {
    try {
        const [rows] = await pool.query('DESCRIBE bookings');
        console.log('โครงสร้างตาราง bookings:');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${row.Key ? `(${row.Key})` : ''} ${row.Default ? `Default: ${row.Default}` : ''}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookingsTable();