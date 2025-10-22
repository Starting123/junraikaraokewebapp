/**
 * Test script เพื่อทดสอบการบันทึกข้อมูล booking_payments
 */

const pool = require('./db');

async function testBookingPaymentsInsert() {
    try {
        console.log('🧪 Testing booking_payments insert...');

        // ข้อมูลทดสอบ
        const testData = {
            booking_id: 1, // ต้องมีการจองนี้ในระบบ
            amount: 500.00,
            method: 'stripe',
            status: 'paid',
            transaction_id: 'test_txn_123456',
            stripe_payment_intent_id: 'pi_test_123456'
        };

        // ทดสอบ INSERT
        const [result] = await pool.query(`
            INSERT INTO booking_payments 
            (booking_id, amount, method, status, transaction_id, payment_date, stripe_payment_intent_id) 
            VALUES (?, ?, ?, ?, ?, NOW(), ?)
        `, [
            testData.booking_id,
            testData.amount,
            testData.method,
            testData.status,
            testData.transaction_id,
            testData.stripe_payment_intent_id
        ]);

        console.log('✅ Test insert successful! Insert ID:', result.insertId);

        // ทดสอบ SELECT
        const [rows] = await pool.query(`
            SELECT * FROM booking_payments WHERE payment_id = ?
        `, [result.insertId]);

        console.log('📋 Inserted data:', rows[0]);

        // ลบข้อมูลทดสอบ
        await pool.query(`
            DELETE FROM booking_payments WHERE payment_id = ?
        `, [result.insertId]);

        console.log('🗑️ Test data cleaned up');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            console.log('💡 Error: ไม่มี booking_id นี้ในระบบ ลองเปลี่ยน booking_id เป็นค่าที่มีอยู่จริง');
        }
    }
}

// ทดสอบการเชื่อมต่อฐานข้อมูล
async function testDatabaseConnection() {
    try {
        console.log('🔌 Testing database connection...');
        const [rows] = await pool.query('SELECT 1 as test');
        console.log('✅ Database connection OK');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

// รันทดสอบ
async function runTests() {
    await testDatabaseConnection();
    await testBookingPaymentsInsert();
    process.exit(0);
}

runTests();