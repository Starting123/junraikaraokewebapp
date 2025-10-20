/**
 * Test OTP Creation and Time Comparison
 * ทดสอบการสร้าง OTP และเปรียบเทียบเวลา
 */

require('dotenv').config();

// Simulate OTP creation
const now = new Date();
const expires = new Date(Date.now() + 15 * 60 * 1000);

console.log('🕐 Current Time Analysis:');
console.log('─'.repeat(80));
console.log('JavaScript Date.now():', Date.now());
console.log('JavaScript new Date():', now);
console.log('JavaScript ISO String:', now.toISOString());
console.log('JavaScript Local String:', now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
console.log('');
console.log('Expires at (+15 minutes):');
console.log('  ISO:', expires.toISOString());
console.log('  Local:', expires.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
console.log('  Timestamp:', expires.getTime());
console.log('');

// Check timezone offset
const offset = now.getTimezoneOffset();
console.log('Timezone Info:');
console.log('─'.repeat(80));
console.log('Timezone Offset:', offset, 'minutes');
console.log('Timezone Offset Hours:', offset / 60, 'hours');
console.log('System Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('');

// Compare different time formats
console.log('Time Format Comparison:');
console.log('─'.repeat(80));
console.log('UTC Time:', now.toUTCString());
console.log('ISO Time:', now.toISOString());
console.log('Local Time:', now.toString());
console.log('Bangkok Time:', now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
console.log('');

// Expected database format
console.log('Expected MySQL DATETIME format:');
console.log('─'.repeat(80));
const mysqlFormat = expires.toISOString().slice(0, 19).replace('T', ' ');
console.log('Format 1 (ISO):', expires.toISOString());
console.log('Format 2 (MySQL):', mysqlFormat);
console.log('');

// Test expiry check
setTimeout(() => {
    const checkTime = new Date();
    const isExpired = checkTime > expires;
    console.log('⏰ After 2 seconds:');
    console.log('─'.repeat(80));
    console.log('Current:', checkTime.toISOString());
    console.log('Expires:', expires.toISOString());
    console.log('Is Expired?', isExpired);
    console.log('Should be:', false);
}, 2000);
