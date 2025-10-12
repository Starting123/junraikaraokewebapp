// =============================================
// Receipt System Test
// =============================================

const SimpleReceiptService = require('./src/services/SimpleReceiptService');
const path = require('path');
const fs = require('fs');

console.log('🧾 Testing Receipt System...\n');

// Test data
const testData = {
    booking: {
        booking_id: 'TEST001',
        room_name: 'ห้อง VIP Premium',
        type_name: 'Premium',
        total_price: 2500.00,
        duration_hours: 2,
        start_time: '2025-10-12 19:00:00',
        end_time: '2025-10-12 21:00:00',
        booking_date: '2025-10-12'
    },
    user: {
        user_id: 1,
        name: 'นายทดสอบ ระบบใบเสร็จ',
        email: 'test@junraikaraoke.com'
    },
    payment: {
        method: 'cash',
        transaction_id: null,
        amount: 2500.00,
        payment_date: new Date()
    },
    receiptNumber: SimpleReceiptService.generateReceiptNumber()
};

async function testReceiptGeneration() {
    try {
        console.log('📄 Generating test receipt...');
        console.log('Receipt Number:', testData.receiptNumber);
        
        const receipt = await SimpleReceiptService.generateSimpleReceipt(testData);
        
        console.log('✅ Receipt generated successfully!');
        console.log('   File:', receipt.fileName);
        console.log('   Path:', receipt.filePath);
        
        // Check if file exists
        if (fs.existsSync(receipt.filePath)) {
            const stats = fs.statSync(receipt.filePath);
            console.log('   Size:', Math.round(stats.size / 1024), 'KB');
            console.log('   Created:', stats.birthtime.toLocaleString('th-TH'));
        }
        
        // Test receipt viewing URL
        const viewUrl = `/api/receipts/view/${testData.receiptNumber}`;
        console.log('   View URL:', viewUrl);
        
        return receipt;
        
    } catch (error) {
        console.error('❌ Receipt generation failed:', error.message);
        throw error;
    }
}

// Test receipt directory
function testReceiptDirectory() {
    console.log('\n📁 Testing receipt directory...');
    
    const receiptDir = path.join(__dirname, 'public/receipts');
    console.log('Receipt directory:', receiptDir);
    
    if (!fs.existsSync(receiptDir)) {
        console.log('⚠️  Creating receipt directory...');
        fs.mkdirSync(receiptDir, { recursive: true });
    }
    
    // List existing receipts
    try {
        const files = fs.readdirSync(receiptDir);
        console.log(`📋 Found ${files.length} receipt files:`);
        
        files.forEach((file, index) => {
            if (file.endsWith('.pdf')) {
                const filePath = path.join(receiptDir, file);
                const stats = fs.statSync(filePath);
                console.log(`   ${index + 1}. ${file} (${Math.round(stats.size / 1024)} KB)`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error reading receipt directory:', error.message);
    }
}

// Run tests
async function runTests() {
    try {
        testReceiptDirectory();
        
        console.log('\n🧪 Running receipt generation test...');
        const receipt = await testReceiptGeneration();
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n🔗 Test receipt can be viewed at:');
        console.log(`   http://localhost:3000/api/receipts/view/${testData.receiptNumber}`);
        console.log(`   http://localhost:3000/receipts/${receipt.fileName}`);
        
        return receipt;
        
    } catch (error) {
        console.error('\n❌ Tests failed:', error.message);
        process.exit(1);
    }
}

// Export for external use
module.exports = { runTests, testData };

// Run if called directly
if (require.main === module) {
    runTests();
}