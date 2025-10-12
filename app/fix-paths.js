#!/usr/bin/env node
/**
 * แก้ไข import paths ในไฟล์ legacy routes ทั้งหมด
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Path mappings to fix
const pathFixes = [
    // Database requires
    { from: "require('../../db')", to: "require('../../../../db')" },
    
    // Model requires  
    { from: "require('../../models/users')", to: "require('../../../models/legacy/users')" },
    { from: "require('../../models/bookings')", to: "require('../../../models/legacy/bookings')" },
    { from: "require('../../models/rooms')", to: "require('../../../models/legacy/rooms')" },
    { from: "require('../../models/orders')", to: "require('../../../models/legacy/orders')" },
    
    // Config requires
    { from: "require('../../config/stripe')", to: "require('../../../config/stripe')" },
    
    // Middleware requires
    { from: "require('../../middleware/auth')", to: "require('../../../middleware/legacy/auth')" },
    
    // Services requires
    { from: "require('../../services/paymentService')", to: "require('../../../services/legacy/paymentService')" },
];

// Get all legacy route files
const legacyFiles = [
    'src/routes/legacy/api/auth.js',
    'src/routes/legacy/api/bookings.js', 
    'src/routes/legacy/api/payments.js',
    'src/routes/legacy/api/orders.js',
    'src/routes/legacy/api/admin.js',
    'src/routes/legacy/users.js'
];

console.log('🔧 Fixing import paths in legacy route files...\n');

let totalFixed = 0;

for (const file of legacyFiles) {
    const fullPath = path.join(__dirname, file);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${file}`);
        continue;
    }
    
    console.log(`📝 Processing: ${file}`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let fileFixed = 0;
    
    for (const fix of pathFixes) {
        if (content.includes(fix.from)) {
            content = content.replaceAll(fix.from, fix.to);
            fileFixed++;
            console.log(`   ✅ ${fix.from} → ${fix.to}`);
        }
    }
    
    if (fileFixed > 0) {
        fs.writeFileSync(fullPath, content);
        totalFixed += fileFixed;
        console.log(`   📊 Fixed ${fileFixed} paths in ${file}`);
    } else {
        console.log(`   ℹ️  No changes needed in ${file}`);
    }
    
    console.log('');
}

console.log(`🎉 Summary: Fixed ${totalFixed} import paths across ${legacyFiles.length} files`);

// Verify syntax of all files
console.log('\n🔍 Verifying syntax...');
const { execSync } = require('child_process');

for (const file of legacyFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        try {
            execSync(`node -c "${fullPath}"`, { stdio: 'pipe' });
            console.log(`✅ ${file} - Syntax OK`);
        } catch (error) {
            console.log(`❌ ${file} - Syntax Error:`);
            console.log(error.stdout.toString());
        }
    }
}

console.log('\n✅ Path fixing complete!');