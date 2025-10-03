const pool = require('./db');

async function checkBookings() {
    try {
        const [rows] = await pool.query(`
            SELECT b.booking_id, b.total_price, b.payment_status, 
                   r.name as room_name, rt.type_name 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.room_id 
            JOIN room_types rt ON r.type_id = rt.type_id 
            ORDER BY b.booking_id DESC LIMIT 5
        `);
        
        console.log('การจองล่าสุด:');
        rows.forEach(row => {
            const amountInSatang = Math.round(parseFloat(row.total_price) * 100);
            console.log(`ID: ${row.booking_id}, ราคา: ${row.total_price} บาท (${amountInSatang} สตางค์), สถานะ: ${row.payment_status}, ห้อง: ${row.room_name} (${row.type_name})`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookings();