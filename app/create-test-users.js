#!/usr/bin/env node
/**
 * Test User Creation Script
 * Creates test users for manual authentication testing
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUsers() {
    let connection;
    
    try {
        // Database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'junraikaraokedatabase'
        });

        console.log('📡 Connected to database');

        // Test users to create
        const testUsers = [
            {
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'AdminPass123!',
                role_id: 1 // Admin
            },
            {
                name: 'Regular User',
                email: 'user@test.com', 
                password: 'UserPass123!',
                role_id: 3 // Customer
            },
            {
                name: 'Manager User',
                email: 'manager@test.com',
                password: 'ManagerPass123!',
                role_id: 2 // Manager (if exists)
            }
        ];

        console.log('🔨 Creating test users...\n');

        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const [existing] = await connection.query('SELECT user_id FROM users WHERE email = ?', [userData.email]);
                
                if (existing.length > 0) {
                    console.log(`⚠️  User ${userData.email} already exists - skipping`);
                    continue;
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(userData.password, 12);

                // Insert user
                const [result] = await connection.query(
                    'INSERT INTO users (name, email, password, role_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [userData.name, userData.email, hashedPassword, userData.role_id, 'active']
                );

                console.log(`✅ Created ${userData.name} (${userData.email})`);
                console.log(`   Role ID: ${userData.role_id}, User ID: ${result.insertId}`);

            } catch (userError) {
                console.error(`❌ Failed to create ${userData.email}:`, userError.message);
            }
        }

        console.log('\n📊 Test Users Summary:');
        console.log('========================');
        
        const [users] = await connection.query('SELECT user_id, name, email, role_id, status FROM users WHERE email LIKE "%@test.com" ORDER BY role_id');
        
        users.forEach(user => {
            const roleNames = { 1: 'Admin', 2: 'Manager', 3: 'Customer' };
            console.log(`ID: ${user.user_id} | ${user.name} | ${user.email} | ${roleNames[user.role_id] || 'Unknown'} | ${user.status}`);
        });

        console.log('\n🧪 Manual Test Credentials:');
        console.log('============================');
        console.log('👑 Admin Login:');
        console.log('   Email: admin@test.com');
        console.log('   Password: AdminPass123!');
        console.log('   Expected Access: /admin, /dashboard, /bookings');
        
        console.log('\n👤 Regular User Login:');
        console.log('   Email: user@test.com');
        console.log('   Password: UserPass123!');
        console.log('   Expected Access: /dashboard, /bookings (NOT /admin)');

        console.log('\n⚙️  Manager Login:');
        console.log('   Email: manager@test.com');
        console.log('   Password: ManagerPass123!');
        console.log('   Expected Access: /dashboard, /bookings (NOT /admin)');

    } catch (error) {
        console.error('❌ Database error:', error.message);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('\n💡 Hint: Users table does not exist. Please run database migrations first.');
        }
        
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📡 Database connection closed');
        }
    }
}

// Check if required environment variables are set
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('💡 Please check your .env file');
    process.exit(1);
}

// Run the script
console.log('🚀 Test User Creation Script Starting...\n');
createTestUsers().catch(console.error);