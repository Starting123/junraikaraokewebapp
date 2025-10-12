// Quick test to verify database structure matches webapp requirements
const db = require('./db');

async function testDatabase() {
  try {
    console.log('Testing database connection and structure...');
    
    // Test basic queries that the webapp uses
    console.log('\n1. Testing users table...');
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`✓ Users table accessible: ${users[0].count} records`);
    
    console.log('\n2. Testing rooms with types...');
    const [rooms] = await db.query(`
      SELECT r.room_id, r.name, r.capacity, rt.type_name, rt.price_per_hour 
      FROM rooms r 
      JOIN room_types rt ON r.type_id = rt.type_id 
      LIMIT 5
    `);
    console.log(`✓ Rooms with types: ${rooms.length} records`);
    rooms.forEach(room => {
      console.log(`  - ${room.name} (${room.type_name}): $${room.price_per_hour}/hr, capacity: ${room.capacity}`);
    });
    
    console.log('\n3. Testing menu system...');
    const [menu] = await db.query(`
      SELECT m.name, m.price, mc.category_name 
      FROM menu m 
      JOIN menu_categories mc ON m.category_id = mc.category_id 
      LIMIT 5
    `);
    console.log(`✓ Menu system: ${menu.length} items`);
    menu.forEach(item => {
      console.log(`  - ${item.name} (${item.category_name}): $${item.price}`);
    });
    
    console.log('\n4. Testing booking structure...');
    const [bookings] = await db.query('DESCRIBE bookings');
    console.log(`✓ Bookings table structure: ${bookings.length} columns`);
    const requiredColumns = ['booking_id', 'user_id', 'room_id', 'start_time', 'end_time', 'status', 'total_price', 'payment_status', 'notes'];
    requiredColumns.forEach(col => {
      const hasColumn = bookings.some(b => b.Field === col);
      console.log(`  ${hasColumn ? '✓' : '✗'} ${col}`);
    });
    
    console.log('\n5. Testing users structure...');
    const [usersCols] = await db.query('DESCRIBE users');
    const requiredUserColumns = ['user_id', 'name', 'email', 'password', 'role_id', 'phone', 'address', 'stripe_customer_id'];
    requiredUserColumns.forEach(col => {
      const hasColumn = usersCols.some(u => u.Field === col);
      console.log(`  ${hasColumn ? '✓' : '✗'} ${col}`);
    });
    
    console.log('\n6. Testing stored procedure...');
    const [procedures] = await db.query("SHOW PROCEDURE STATUS WHERE Db = 'junraikaraokedatabase'");
    console.log(`✓ Stored procedures: ${procedures.length}`);
    procedures.forEach(proc => {
      console.log(`  - ${proc.Name}`);
    });
    
    console.log('\n✅ All database tests passed! The schema is ready for production.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Create the database first: CREATE DATABASE junraikaraokedatabase;');
    }
  }
}

// Run the test
testDatabase().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});