/**
 * Check existing bookings in database
 */

const pool = require('./db');

async function checkBookings() {
    try {
        console.log('📋 Checking existing bookings...');
        
        const [bookings] = await pool.query(`
            SELECT booking_id, user_id, payment_status, total_price, created_at 
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('📊 Recent bookings:');
        bookings.forEach(booking => {
            console.log(`- ID: ${booking.booking_id}, User: ${booking.user_id}, Status: ${booking.payment_status}, Price: ${booking.total_price}`);
        });

        console.log('\n🔍 Checking booking_payments table...');
        
        const [payments] = await pool.query(`
            SELECT * FROM booking_payments ORDER BY created_at DESC LIMIT 5
        `);

        console.log('💳 Recent payments:');
        if (payments.length === 0) {
            console.log('  No payments found');
        } else {
            payments.forEach(payment => {
                console.log(`- Payment ID: ${payment.payment_id}, Booking: ${payment.booking_id}, Method: ${payment.method}, Amount: ${payment.amount}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
}

checkBookings();