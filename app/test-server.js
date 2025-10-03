const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// Test route สำหรับดู error handling
app.post('/test-booking', (req, res) => {
    // จำลองการจองสำเร็จ
    res.json({
        success: true,
        message: 'Booking successful',
        booking: { id: 123, room: 'Test Room' }
    });
});

// Test route สำหรับดู room conflict
app.post('/test-conflict', (req, res) => {
    // จำลองห้องถูกจองแล้ว
    res.status(409).json({
        success: false,
        error: 'Error: Room already booked',
        message: 'ห้องนี้ถูกใช้งานอยู่ในเวลา 14:00–16:00',
        nextAvailable: '2025-10-03T17:00:00Z',
        suggestion: 'สามารถจองได้อีกครั้งในเวลา 17:00'
    });
});

// Test route สำหรับดูการยกเลิก
app.post('/test-cancel', (req, res) => {
    res.json({
        success: true,
        message: 'Cancel successful'
    });
});

app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
    console.log('ทดสอบ API endpoints:');
    console.log('- POST /test-booking (การจองสำเร็จ)');
    console.log('- POST /test-conflict (ห้องถูกจองแล้ว)');
    console.log('- POST /test-cancel (ยกเลิกการจองสำเร็จ)');
});
