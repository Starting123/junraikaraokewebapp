const pool = require('./db');

async function fixDurationAndPrice() {
    try {
        // คำนวณ duration_hours จริงและอัปเดตราคา
        const [rows] = await pool.query(`
            SELECT b.booking_id, b.start_time, b.end_time, b.duration_hours,
                   TIMESTAMPDIFF(HOUR, b.start_time, b.end_time) as actual_hours,
                   rt.price_per_hour
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.room_id 
            JOIN room_types rt ON r.type_id = rt.type_id 
            WHERE b.booking_id = 6
        `);
        
        const booking = rows[0];
        console.log('ข้อมูลการจอง ID 6:');
        console.log(`เวลาเริ่ม: ${booking.start_time}`);
        console.log(`เวลาสิ้นสุด: ${booking.end_time}`);
        console.log(`ชั่วโมงที่บันทึก: ${booking.duration_hours}`);
        console.log(`ชั่วโมงจริง: ${booking.actual_hours}`);
        console.log(`ราคาต่อชั่วโมง: ${booking.price_per_hour}`);
        
        const correctHours = booking.actual_hours;
        const correctPrice = correctHours * booking.price_per_hour;
        
        console.log(`ราคาที่ถูกต้อง: ${correctPrice} บาท`);
        
        // อัปเดตข้อมูลให้ถูกต้อง
        await pool.query(`
            UPDATE bookings 
            SET duration_hours = ?, total_price = ? 
            WHERE booking_id = ?
        `, [correctHours, correctPrice, booking.booking_id]);
        
        console.log('อัปเดตข้อมูลสำเร็จ');
        process.exit(0);
        
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixDurationAndPrice();