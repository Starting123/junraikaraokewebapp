#!/usr/bin/env node

/**
 * ==========================================
 * LEGACY CLEANUP SCRIPT
 * ==========================================
 * 
 * This script safely removes all legacy files and folders
 * after modular refactor is complete.
 * 
 * Usage:
 *   node scripts/cleanup-legacy.js [phase]
 * 
 * Phases:
 *   1. backup          - Create safety backup
 *   2. root-legacy     - Remove root legacy files
 *   3. src-flat        - Remove old src/ flat structure
 *   4. migrated-views  - Remove migrated view files
 *   5. old-scripts     - Remove obsolete utility scripts
 *   6. verify          - Verify application still works
 *   all               - Run all phases
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.join(__dirname, '..');

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function deleteFile(filePath) {
    const fullPath = path.join(BASE_DIR, filePath);
    if (fs.existsSync(fullPath)) {
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                log(`   ✅ Deleted folder: ${filePath}`, 'green');
            } else {
                fs.unlinkSync(fullPath);
                log(`   ✅ Deleted file: ${filePath}`, 'green');
            }
            return true;
        } catch (error) {
            log(`   ❌ Failed to delete ${filePath}: ${error.message}`, 'red');
            return false;
        }
    } else {
        log(`   ⚠️  Not found (already deleted?): ${filePath}`, 'yellow');
        return false;
    }
}

function phase1_backup() {
    log('\n💾 PHASE 1: Creating Safety Backup', 'blue');
    log('========================================\n', 'blue');
    
    try {
        // Check if there are uncommitted changes
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        
        if (status.trim()) {
            log('⚠️  You have uncommitted changes!', 'yellow');
            log('Creating safety commit...', 'yellow');
            execSync('git add .', { cwd: BASE_DIR });
            execSync('git commit -m "chore: Before legacy cleanup"', { cwd: BASE_DIR });
            log('✅ Safety commit created', 'green');
        }
        
        // Create backup branch
        try {
            execSync('git checkout -b backup/pre-cleanup', { cwd: BASE_DIR });
            log('✅ Created backup branch: backup/pre-cleanup', 'green');
            
            // Go back to refactor branch
            execSync('git checkout refactor/modular-structure', { cwd: BASE_DIR });
            log('✅ Switched back to refactor/modular-structure', 'green');
        } catch (error) {
            // Branch might already exist
            if (error.message.includes('already exists')) {
                log('⚠️  Backup branch already exists, skipping...', 'yellow');
            } else {
                throw error;
            }
        }
        
        log('\n✅ Phase 1 Complete!', 'green');
    } catch (error) {
        log(`\n❌ Phase 1 Failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

function phase2_rootLegacy() {
    log('\n🗑️  PHASE 2: Removing Root Legacy Files', 'blue');
    log('========================================\n', 'blue');
    
    let deleted = 0;
    let total = 0;
    
    const filesToDelete = [
        'app.js',              // Legacy entry point
        'bin',                 // Legacy server folder
        'config',              // Duplicate config
        'middleware',          // Duplicate middleware
        'services',            // Duplicate services (only paymentService.js)
        'routes/index.js'      // Empty stub
    ];
    
    filesToDelete.forEach(file => {
        total++;
        if (deleteFile(file)) deleted++;
    });
    
    log(`\n📊 Deleted ${deleted}/${total} items`, 'magenta');
    log('✅ Phase 2 Complete!', 'green');
}

function phase3_srcFlat() {
    log('\n🗑️  PHASE 3: Removing Old src/ Flat Structure', 'blue');
    log('========================================\n', 'blue');
    
    let deleted = 0;
    let total = 0;
    
    const foldersToDelete = [
        'src/config',          // Moved to src/core/config
        'src/controllers',     // Moved to src/modules/*/controllers
        'src/middleware',      // Moved to src/core/middleware
        'src/models',          // Moved to src/modules/*/models
        'src/services',        // Moved to src/modules/*/services
        'src/utils',           // Moved to src/core/utils
        'src/validators',      // Moved to src/modules/*/validators
        'src/public',          // Duplicate of public/
        'src/logs',            // Duplicate of logs/
        'src/routes'           // All routes moved to src/modules/*/routes
    ];
    
    foldersToDelete.forEach(folder => {
        total++;
        if (deleteFile(folder)) deleted++;
    });
    
    log(`\n📊 Deleted ${deleted}/${total} folders`, 'magenta');
    log('✅ Phase 3 Complete!', 'green');
}

function phase4_migratedViews() {
    log('\n🗑️  PHASE 4: Removing Migrated View Files', 'blue');
    log('========================================\n', 'blue');
    
    let deleted = 0;
    let total = 0;
    
    const viewsToDelete = [
        'views/auth',              // Folder migrated to src/modules/auth/views/
        'views/admin.ejs',         // Migrated to src/modules/admin/views/
        'views/bookings.ejs',      // Migrated to src/modules/bookings/views/
        'views/rooms.ejs',         // Migrated to src/modules/rooms/views/
        'views/roomForm.ejs',      // Migrated to src/modules/rooms/views/
        'views/payment.ejs',       // Migrated to src/modules/payments/views/
        'views/payment-success.ejs', // Migrated to src/modules/payments/views/
        'views/payment-cancel.ejs'  // Migrated to src/modules/payments/views/
    ];
    
    viewsToDelete.forEach(view => {
        total++;
        if (deleteFile(view)) deleted++;
    });
    
    log(`\n📊 Deleted ${deleted}/${total} views`, 'magenta');
    log('✅ Phase 4 Complete!', 'green');
    
    log('\n⚠️  KEPT (Still in use):', 'yellow');
    log('   ✅ views/index.ejs - Homepage');
    log('   ✅ views/dashboard.ejs - User dashboard');
    log('   ✅ views/contact.ejs - Contact page');
    log('   ✅ views/error.ejs - Error handler');
    log('   ✅ views/receipts.ejs - Receipt viewer');
    log('   ✅ views/apiTester.ejs - Dev tool');
    log('   ✅ views/stripe-checkout.ejs - Stripe flow');
    log('   ✅ views/partials/ - Global partials');
}

function phase5_oldScripts() {
    log('\n🗑️  PHASE 5: Removing Obsolete Utility Scripts', 'blue');
    log('========================================\n', 'blue');
    
    let deleted = 0;
    let total = 0;
    
    const scriptsToDelete = [
        'fix-paths.js',        // No longer needed
        'update-paths.js',     // No longer needed
        'update-stripe-db.js'  // One-time migration (done)
    ];
    
    scriptsToDelete.forEach(script => {
        total++;
        if (deleteFile(script)) deleted++;
    });
    
    log(`\n📊 Deleted ${deleted}/${total} scripts`, 'magenta');
    log('✅ Phase 5 Complete!', 'green');
    
    log('\n⚠️  KEPT (Still useful):', 'yellow');
    log('   ✅ check_*.js - Database check tools');
    log('   ✅ debug_*.js - Debugging tools');
    log('   ✅ fix_*.js - Data fix scripts');
    log('   ✅ test-*.js - System test tools');
    log('   ✅ scripts/migrate-to-modular.js - Migration script');
}

function phase6_verify() {
    log('\n✅ PHASE 6: Verifying Application', 'blue');
    log('========================================\n', 'blue');
    
    try {
        // Test 1: Check if src/app.js can be required
        log('🔍 Test 1: Loading src/app.js...', 'blue');
        try {
            require(path.join(BASE_DIR, 'src', 'app.js'));
            log('   ✅ Application loads successfully', 'green');
        } catch (error) {
            log(`   ❌ Failed to load: ${error.message}`, 'red');
            throw error;
        }
        
        // Test 2: Check directory structure
        log('\n🔍 Test 2: Checking directory structure...', 'blue');
        const requiredDirs = [
            'src/modules/auth',
            'src/modules/bookings',
            'src/modules/payments',
            'src/modules/rooms',
            'src/modules/users',
            'src/modules/admin',
            'src/modules/orders',
            'src/core/middleware',
            'src/core/config',
            'src/core/utils'
        ];
        
        let allPresent = true;
        requiredDirs.forEach(dir => {
            const exists = fs.existsSync(path.join(BASE_DIR, dir));
            if (exists) {
                log(`   ✅ ${dir}`, 'green');
            } else {
                log(`   ❌ Missing: ${dir}`, 'red');
                allPresent = false;
            }
        });
        
        if (!allPresent) {
            throw new Error('Some required directories are missing!');
        }
        
        // Test 3: Check legacy files are gone
        log('\n🔍 Test 3: Verifying legacy files are deleted...', 'blue');
        const shouldNotExist = [
            'app.js',
            'bin',
            'config',
            'middleware',
            'services',
            'src/routes/legacy',
            'src/controllers',
            'src/models',
            'src/services'
        ];
        
        let allGone = true;
        shouldNotExist.forEach(file => {
            const exists = fs.existsSync(path.join(BASE_DIR, file));
            if (!exists) {
                log(`   ✅ Deleted: ${file}`, 'green');
            } else {
                log(`   ⚠️  Still exists: ${file}`, 'yellow');
                allGone = false;
            }
        });
        
        log('\n' + '='.repeat(60), 'magenta');
        log('📊 CLEANUP VERIFICATION SUMMARY', 'magenta');
        log('='.repeat(60), 'magenta');
        log('✅ Application loads correctly', 'green');
        log('✅ All required directories present', 'green');
        log(allGone ? '✅ All legacy files removed' : '⚠️  Some legacy files remain', allGone ? 'green' : 'yellow');
        log('\n🎊 VERIFICATION COMPLETE! 🎊\n', 'green');
        
        log('📝 NEXT STEPS:', 'blue');
        log('1. Start server: npm run dev');
        log('2. Test endpoints in browser');
        log('3. Check for any errors in logs');
        log('4. Commit changes: git commit -m "chore: Remove legacy files"');
        log('5. Push to remote: git push origin refactor/modular-structure\n');
        
    } catch (error) {
        log(`\n❌ Verification Failed: ${error.message}`, 'red');
        log('\n⚠️  ROLLBACK INSTRUCTIONS:', 'yellow');
        log('git checkout backup/pre-cleanup');
        process.exit(1);
    }
}

function runAll() {
    log('\n' + '='.repeat(60), 'magenta');
    log('🧹 LEGACY CLEANUP - FULL EXECUTION', 'magenta');
    log('='.repeat(60) + '\n', 'magenta');
    
    phase1_backup();
    phase2_rootLegacy();
    phase3_srcFlat();
    phase4_migratedViews();
    phase5_oldScripts();
    phase6_verify();
    
    log('\n' + '='.repeat(60), 'green');
    log('✅ ALL PHASES COMPLETE!', 'green');
    log('='.repeat(60) + '\n', 'green');
}

// Main execution
const phase = process.argv[2];

if (!phase) {
    log('\n❌ Error: No phase specified', 'red');
    log('\nUsage: node scripts/cleanup-legacy.js [phase]', 'yellow');
    log('\nAvailable phases:', 'blue');
    log('  1, backup          - Create safety backup');
    log('  2, root-legacy     - Remove root legacy files');
    log('  3, src-flat        - Remove old src/ flat structure');
    log('  4, migrated-views  - Remove migrated view files');
    log('  5, old-scripts     - Remove obsolete utility scripts');
    log('  6, verify          - Verify application still works');
    log('  all                - Run all phases\n');
    process.exit(1);
}

switch (phase) {
    case '1':
    case 'backup':
        phase1_backup();
        break;
    case '2':
    case 'root-legacy':
        phase2_rootLegacy();
        break;
    case '3':
    case 'src-flat':
        phase3_srcFlat();
        break;
    case '4':
    case 'migrated-views':
        phase4_migratedViews();
        break;
    case '5':
    case 'old-scripts':
        phase5_oldScripts();
        break;
    case '6':
    case 'verify':
        phase6_verify();
        break;
    case 'all':
        runAll();
        break;
    default:
        log(`\n❌ Unknown phase: ${phase}`, 'red');
        process.exit(1);
}
