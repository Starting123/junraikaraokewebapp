const pool = require('./db');

async function checkBookingDetails() {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, r.name as room_name, rt.type_name, rt.price_per_hour 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.room_id 
            JOIN room_types rt ON r.type_id = rt.type_id 
            WHERE b.booking_id = 6
        `);
        
        console.log('รายละเอียดการจอง ID 6:');
        console.log(rows[0]);
        
        // ตรวจสอบข้อมูลราคา room types
        const [roomTypes] = await pool.query('SELECT * FROM room_types');
        console.log('\nราคาห้องแต่ละประเภท:');
        roomTypes.forEach(rt => {
            console.log(`${rt.type_name}: ${rt.price_per_hour} บาท/ชั่วโมง`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookingDetails();