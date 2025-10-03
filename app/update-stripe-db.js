const mysql = require('mysql2/promise');

async function updateDatabaseForStripe() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'junraikaraokedatabase'
        });

        console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');

        // 1. เพิ่ม stripe_customer_id ในตาราง users
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN stripe_customer_id VARCHAR(255) NULL COMMENT 'Stripe Customer ID'
            `);
            console.log('✓ เพิ่ม stripe_customer_id column ในตาราง users สำเร็จ');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ stripe_customer_id column มีอยู่แล้วในตาราง users');
            } else {
                throw error;
            }
        }

        // 2. เพิ่ม stripe_payment_intent_id ในตาราง booking_payments
        try {
            await connection.query(`
                ALTER TABLE booking_payments 
                ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL COMMENT 'Stripe Payment Intent ID'
            `);
            console.log('✓ เพิ่ม stripe_payment_intent_id column ในตาราง booking_payments สำเร็จ');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ stripe_payment_intent_id column มีอยู่แล้วในตาราง booking_payments');
            } else {
                throw error;
            }
        }

        // 3. เพิ่ม index สำหรับ stripe fields
        try {
            await connection.query(`
                CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id)
            `);
            console.log('✓ เพิ่ม index สำหรับ stripe_customer_id สำเร็จ');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✓ index สำหรับ stripe_customer_id มีอยู่แล้ว');
            } else {
                console.log('เตือน (index users):', error.message);
            }
        }

        try {
            await connection.query(`
                CREATE INDEX idx_booking_payments_stripe_intent ON booking_payments(stripe_payment_intent_id)
            `);
            console.log('✓ เพิ่ม index สำหรับ stripe_payment_intent_id สำเร็จ');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✓ index สำหรับ stripe_payment_intent_id มีอยู่แล้ว');
            } else {
                console.log('เตือน (index booking_payments):', error.message);
            }
        }

        // 4. ตรวจสอบโครงสร้างตาราง
        const [usersColumns] = await connection.query('DESCRIBE users');
        console.log('\n=== โครงสร้างตาราง users ===');
        usersColumns.forEach(col => {
            if (col.Field === 'stripe_customer_id') {
                console.log(`✓ ${col.Field}: ${col.Type} ${col.Null} ${col.Default || ''}`);
            }
        });

        const [paymentsColumns] = await connection.query('DESCRIBE booking_payments');
        console.log('\n=== โครงสร้างตาราง booking_payments ===');
        paymentsColumns.forEach(col => {
            if (col.Field === 'stripe_payment_intent_id') {
                console.log(`✓ ${col.Field}: ${col.Type} ${col.Null} ${col.Default || ''}`);
            }
        });

        await connection.end();
        console.log('\n🎉 อัปเดตฐานข้อมูลสำหรับ Stripe เสร็จสิ้น!');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    }
}

updateDatabaseForStripe();