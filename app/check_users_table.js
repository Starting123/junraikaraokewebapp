const pool = require('./db');

async function checkUsersTable() {
    try {
        const [rows] = await pool.query('DESCRIBE users');
        console.log('โครงสร้างตาราง users:');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${row.Key ? `(${row.Key})` : ''} ${row.Default ? `Default: ${row.Default}` : ''}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsersTable();