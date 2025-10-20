const { promisePool } = require('./src/config/database');

async function debugOTPVerify() {
    try {
        console.log('\n🔍 Debug OTP Verification');
        console.log('═'.repeat(80));
        
        // ดึง OTP ล่าสุด
        const [rows] = await promisePool.query(
            'SELECT user_id, reset_otp, reset_otp_expires FROM users WHERE reset_otp IS NOT NULL ORDER BY reset_otp_expires DESC LIMIT 1'
        );
        
        if (rows.length === 0) {
            console.log('❌ ไม่มี OTP ในระบบ');
            return;
        }
        
        const user = rows[0];
        console.log('\n📋 OTP Data from Database:');
        console.log(`   User ID: ${user.user_id}`);
        console.log(`   OTP: ${user.reset_otp}`);
        console.log(`   Expires (raw): ${user.reset_otp_expires}`);
        console.log(`   Expires (type): ${typeof user.reset_otp_expires}`);
        
        // ตรวจสอบการแปลง
        const expiresDate = new Date(user.reset_otp_expires);
        console.log('\n⏰ Date Conversion:');
        console.log(`   new Date(expires): ${expiresDate}`);
        console.log(`   ISO String: ${expiresDate.toISOString()}`);
        console.log(`   Timestamp: ${expiresDate.getTime()}`);
        
        // เวลาปัจจุบัน
        const now = new Date();
        console.log('\n🕐 Current Time:');
        console.log(`   Date.now(): ${Date.now()}`);
        console.log(`   new Date(): ${now}`);
        console.log(`   ISO String: ${now.toISOString()}`);
        console.log(`   Timestamp: ${now.getTime()}`);
        
        // เปรียบเทียบ
        const diff = expiresDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diff / 1000 / 60);
        const diffSeconds = Math.floor((diff / 1000) % 60);
        
        console.log('\n⏱️  Time Comparison:');
        console.log(`   Expires Timestamp: ${expiresDate.getTime()}`);
        console.log(`   Now Timestamp:     ${now.getTime()}`);
        console.log(`   Difference:        ${diff} ms`);
        console.log(`   Difference:        ${diffMinutes} นาที ${diffSeconds} วินาที`);
        console.log(`   Is Expired?        ${expiresDate.getTime() < now.getTime() ? '✅ YES (EXPIRED)' : '❌ NO (VALID)'}`);
        
        // ตรวจสอบว่า MySQL ส่งค่ามาเป็น local time หรือ UTC
        console.log('\n🌍 Timezone Analysis:');
        const [timeRows] = await promisePool.query('SELECT NOW() as db_now, UTC_TIMESTAMP() as db_utc');
        console.log(`   MySQL NOW():           ${timeRows[0].db_now}`);
        console.log(`   MySQL UTC_TIMESTAMP(): ${timeRows[0].db_utc}`);
        console.log(`   Node.js Local:         ${now}`);
        console.log(`   Node.js UTC:           ${now.toISOString()}`);
        
        // ดูว่า reset_otp_expires เป็น UTC หรือ Local
        const mysqlExpires = user.reset_otp_expires;
        if (mysqlExpires instanceof Date) {
            console.log(`\n   MySQL returned Date object: ${mysqlExpires}`);
        } else {
            console.log(`\n   MySQL returned string: ${mysqlExpires}`);
            // ลองแปลงเป็น UTC
            const expiresUTC = new Date(mysqlExpires + 'Z');
            console.log(`   If treated as UTC: ${expiresUTC.toISOString()}`);
            const diffUTC = expiresUTC.getTime() - now.getTime();
            console.log(`   Difference if UTC: ${Math.floor(diffUTC / 1000 / 60)} นาที`);
        }
        
        console.log('\n═'.repeat(80));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

debugOTPVerify();
