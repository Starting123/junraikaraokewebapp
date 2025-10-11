#!/usr/bin/env node
/**
 * Simple registration test script
 * Tests the registration functionality without starting the full server
 */

const bcrypt = require('bcryptjs');
const usersModel = require('./models/users');
require('dotenv').config();

async function testRegistration() {
    try {
        console.log('🧪 Testing Registration Functionality...\n');
        
        // Test data
        const testUser = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'testpass123'
        };
        
        console.log('1. Testing user creation...');
        
        // Check if user already exists
        const existingUser = await usersModel.findByEmail(testUser.email);
        if (existingUser) {
            console.log('   ℹ️  Test user already exists, skipping creation');
        } else {
            // Hash password (as done in controller)
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            
            // Create user
            const userId = await usersModel.create({
                name: testUser.name,
                email: testUser.email,
                password: hashedPassword,
                role_id: 2
            });
            
            console.log(`   ✅ User created successfully with ID: ${userId}`);
        }
        
        console.log('\n2. Testing user retrieval...');
        const retrievedUser = await usersModel.findByEmail(testUser.email);
        
        if (retrievedUser) {
            console.log('   ✅ User found:', {
                user_id: retrievedUser.user_id,
                name: retrievedUser.name,
                email: retrievedUser.email,
                role_id: retrievedUser.role_id
            });
        } else {
            console.log('   ❌ User not found');
        }
        
        console.log('\n3. Testing password verification...');
        if (retrievedUser) {
            const isValid = await bcrypt.compare(testUser.password, retrievedUser.password);
            console.log(`   ${isValid ? '✅' : '❌'} Password verification: ${isValid ? 'PASS' : 'FAIL'}`);
        }
        
        console.log('\n🎉 Registration test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

// Run the test
testRegistration();