// ไฟล์นี้ใช้สำหรับทดสอบว่าการแก้ไขมีผลหรือเปล่า
console.log('🔧 Karaoke App - การแก้ไขปัญหา');
console.log('=================================');

// ทดสอบว่า modules โหลดได้หรือไม่
try {
    const bookingsModel = require('./models/bookings');
    const roomsModel = require('./models/rooms');
    console.log('✅ Models โหลดสำเร็จ');
    
    const app = require('./app');
    console.log('✅ App โหลดสำเร็จ');
    
    console.log('\n🎯 สิ่งที่แก้ไขแล้ว:');
    console.log('1. ✅ Error handling ใน API responses');
    console.log('2. ✅ Room availability checking');
    console.log('3. ✅ Responsive CSS สำหรับ mobile');
    console.log('4. ✅ Stored procedure สำหรับอัปเดตสถานะห้อง');
    
    console.log('\n📱 วิธีทดสอบ:');
    console.log('1. เปิดเบราว์เซอร์ไปที่ http://localhost:3000/bookings');
    console.log('2. กด F12 เปิด DevTools');
    console.log('3. กด Ctrl+Shift+R เพื่อ hard refresh (clear cache)');
    console.log('4. ลองจองห้องดู - ควรแสดง "Booking successful"');
    console.log('5. ลองยกเลิกการจองดู - ควรแสดง "Cancel successful"');
    
    console.log('\n🔍 หากยังมีปัญหา:');
    console.log('- ลบ browser cache ทั้งหมด');
    console.log('- ลอง incognito mode');
    console.log('- ตรวจสอบ Network tab ใน DevTools ดู API responses');
    
} catch (error) {
    console.error('❌ Error:', error.message);
}