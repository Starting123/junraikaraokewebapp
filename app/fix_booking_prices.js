const pool = require('./db');

async function updateBookingPrices() {
    try {
        // อัปเดตราคาสำหรับการจองที่มี total_price = 0
        const [rows] = await pool.query(`
            SELECT b.booking_id, b.duration_hours, rt.price_per_hour, 
                   (b.duration_hours * rt.price_per_hour) as calculated_price
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.room_id 
            JOIN room_types rt ON r.type_id = rt.type_id 
            WHERE b.total_price = 0
        `);
        
        console.log('การจองที่ต้องอัปเดตราคา:');
        
        for (const booking of rows) {
            console.log(`Booking ID: ${booking.booking_id}, ชั่วโมง: ${booking.duration_hours}, ราคา/ชม: ${booking.price_per_hour}, ราคารวม: ${booking.calculated_price}`);
            
            // อัปเดตราคาในฐานข้อมูล
            await pool.query(
                'UPDATE bookings SET total_price = ? WHERE booking_id = ?',
                [booking.calculated_price, booking.booking_id]
            );
        }
        
        console.log(`อัปเดตราคาสำเร็จสำหรับ ${rows.length} การจอง`);
        process.exit(0);
        
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateBookingPrices();