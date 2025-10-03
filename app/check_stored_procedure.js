const pool = require('./db');

async function checkStoredProcedure() {
    try {
        const [rows] = await pool.query("SHOW PROCEDURE STATUS WHERE Name = 'UpdateRoomStatus'");
        console.log('Stored procedures found:', rows.length);
        if (rows.length === 0) {
            console.log('Creating UpdateRoomStatus procedure...');
            
            // สร้าง stored procedure
            await pool.query(`
                CREATE PROCEDURE UpdateRoomStatus()
                BEGIN
                    -- อัปเดตสถานะห้องเป็น available สำหรับการจองที่หมดเวลาแล้ว
                    UPDATE rooms r 
                    SET r.status = 'available' 
                    WHERE r.room_id IN (
                        SELECT DISTINCT room_id 
                        FROM bookings 
                        WHERE status = 'active' 
                        AND end_time <= NOW()
                    );
                    
                    -- อัปเดตสถานะการจองที่หมดเวลา
                    UPDATE bookings 
                    SET status = 'completed' 
                    WHERE status = 'active' 
                    AND end_time <= NOW();
                END
            `);
            
            console.log('UpdateRoomStatus procedure created successfully');
        } else {
            console.log('UpdateRoomStatus procedure already exists');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkStoredProcedure();