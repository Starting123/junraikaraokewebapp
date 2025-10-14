#!/usr/bin/env node

/**
 * ==========================================
 * MODULAR MIGRATION SCRIPT
 * ==========================================
 * 
 * This script helps migrate the Junrai Karaoke app
 * from flat structure to modular architecture.
 * 
 * Usage:
 *   node scripts/migrate-to-modular.js [phase]
 * 
 * Phases:
 *   1. setup      - Create directory structure
 *   2. auth       - Migrate auth module
 *   3. bookings   - Migrate bookings module
 *   4. payments   - Migrate payments module
 *   5. rooms      - Migrate rooms module
 *   6. users      - Migrate users module
 *   7. admin      - Migrate admin module
 *   8. orders     - Migrate orders module
 *   9. core       - Migrate core utilities
 *   10. cleanup   - Remove legacy files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`✅ Created: ${dirPath}`, 'green');
    } else {
        log(`⏭️  Already exists: ${dirPath}`, 'yellow');
    }
}

function moveFile(source, dest) {
    const sourcePath = path.join(BASE_DIR, source);
    const destPath = path.join(BASE_DIR, dest);
    
    if (fs.existsSync(sourcePath)) {
        // Create destination directory if it doesn't exist
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy file (don't delete source yet for safety)
        fs.copyFileSync(sourcePath, destPath);
        log(`✅ Moved: ${source} → ${dest}`, 'green');
    } else {
        log(`❌ Source not found: ${source}`, 'red');
    }
}

function phase1_setup() {
    log('\n📦 PHASE 1: Creating Directory Structure', 'blue');
    log('==========================================\n', 'blue');
    
    const modules = ['auth', 'bookings', 'payments', 'rooms', 'users', 'admin', 'orders'];
    const subdirs = ['controllers', 'services', 'models', 'routes', 'validators', 'views'];
    
    // Create modules structure
    modules.forEach(module => {
        createDir(path.join(SRC_DIR, 'modules', module));
        subdirs.forEach(subdir => {
            createDir(path.join(SRC_DIR, 'modules', module, subdir));
        });
    });
    
    // Create core structure
    createDir(path.join(SRC_DIR, 'core'));
    ['middleware', 'config', 'utils', 'validators'].forEach(dir => {
        createDir(path.join(SRC_DIR, 'core', dir));
    });
    
    log('\n✅ Phase 1 Complete!', 'green');
}

function phase2_auth() {
    log('\n🔐 PHASE 2: Migrating Auth Module', 'blue');
    log('==========================================\n', 'blue');
    
    // Move controllers
    moveFile('src/controllers/AuthController.js', 'src/modules/auth/controllers/AuthController.js');
    
    // Move services
    moveFile('src/services/AuthService.js', 'src/modules/auth/services/AuthService.js');
    moveFile('src/services/MailService.js', 'src/modules/auth/services/MailService.js');
    
    // Move models
    moveFile('src/models/User.js', 'src/modules/auth/models/User.js');
    
    // Move routes
    moveFile('src/routes/auth.js', 'src/modules/auth/routes/auth.routes.js');
    
    // Move validators
    moveFile('src/validators/authValidators.js', 'src/modules/auth/validators/authValidators.js');
    
    // Move views
    moveFile('views/auth/forgot-password.ejs', 'src/modules/auth/views/forgot-password.ejs');
    moveFile('views/auth/reset-password.ejs', 'src/modules/auth/views/reset-password.ejs');
    moveFile('views/auth.ejs', 'src/modules/auth/views/auth.ejs');
    
    log('\n✅ Phase 2 Complete!', 'green');
    log('⚠️  Remember to update import paths!', 'yellow');
}

function phase3_bookings() {
    log('\n📅 PHASE 3: Migrating Bookings Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/BookingController.js', 'src/modules/bookings/controllers/BookingController.js');
    moveFile('src/services/BookingService.js', 'src/modules/bookings/services/BookingService.js');
    moveFile('src/models/Booking.js', 'src/modules/bookings/models/Booking.js');
    moveFile('src/routes/bookings.js', 'src/modules/bookings/routes/bookings.routes.js');
    moveFile('src/validators/bookingValidators.js', 'src/modules/bookings/validators/bookingValidators.js');
    moveFile('views/bookings.ejs', 'src/modules/bookings/views/bookings.ejs');
    
    log('\n✅ Phase 3 Complete!', 'green');
}

function phase4_payments() {
    log('\n💳 PHASE 4: Migrating Payments Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/PaymentController.js', 'src/modules/payments/controllers/PaymentController.js');
    moveFile('src/services/PaymentService.js', 'src/modules/payments/services/PaymentService.js');
    moveFile('src/services/ReceiptService.js', 'src/modules/payments/services/ReceiptService.js');
    moveFile('src/services/SimpleReceiptService.js', 'src/modules/payments/services/SimpleReceiptService.js');
    moveFile('src/services/UnicodeReceiptService.js', 'src/modules/payments/services/UnicodeReceiptService.js');
    moveFile('src/routes/payments.js', 'src/modules/payments/routes/payments.routes.js');
    moveFile('views/payment.ejs', 'src/modules/payments/views/payment.ejs');
    moveFile('views/payment-success.ejs', 'src/modules/payments/views/payment-success.ejs');
    moveFile('views/payment-cancel.ejs', 'src/modules/payments/views/payment-cancel.ejs');
    
    log('\n✅ Phase 4 Complete!', 'green');
}

function phase5_rooms() {
    log('\n🏠 PHASE 5: Migrating Rooms Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/RoomController.js', 'src/modules/rooms/controllers/RoomController.js');
    moveFile('src/models/Room.js', 'src/modules/rooms/models/Room.js');
    moveFile('src/routes/rooms.js', 'src/modules/rooms/routes/rooms.routes.js');
    moveFile('views/rooms.ejs', 'src/modules/rooms/views/rooms.ejs');
    moveFile('views/roomForm.ejs', 'src/modules/rooms/views/roomForm.ejs');
    
    log('\n✅ Phase 5 Complete!', 'green');
}

function phase6_users() {
    log('\n👥 PHASE 6: Migrating Users Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/UserController.js', 'src/modules/users/controllers/UserController.js');
    moveFile('src/routes/users.js', 'src/modules/users/routes/users.routes.js');
    
    log('\n✅ Phase 6 Complete!', 'green');
}

function phase7_admin() {
    log('\n👑 PHASE 7: Migrating Admin Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/AdminController.js', 'src/modules/admin/controllers/AdminController.js');
    moveFile('src/routes/admin.js', 'src/modules/admin/routes/admin.routes.js');
    moveFile('views/admin.ejs', 'src/modules/admin/views/admin.ejs');
    
    log('\n✅ Phase 7 Complete!', 'green');
}

function phase8_orders() {
    log('\n📋 PHASE 8: Migrating Orders Module', 'blue');
    log('==========================================\n', 'blue');
    
    moveFile('src/controllers/OrderController.js', 'src/modules/orders/controllers/OrderController.js');
    moveFile('src/models/Order.js', 'src/modules/orders/models/Order.js');
    moveFile('src/routes/orders.js', 'src/modules/orders/routes/orders.routes.js');
    
    log('\n✅ Phase 8 Complete!', 'green');
}

function phase9_core() {
    log('\n⚙️  PHASE 9: Migrating Core Utilities', 'blue');
    log('==========================================\n', 'blue');
    
    // Move middleware
    const middlewareFiles = fs.readdirSync(path.join(SRC_DIR, 'middleware'));
    middlewareFiles.forEach(file => {
        moveFile(`src/middleware/${file}`, `src/core/middleware/${file}`);
    });
    
    // Move config
    const configFiles = fs.readdirSync(path.join(SRC_DIR, 'config'));
    configFiles.forEach(file => {
        moveFile(`src/config/${file}`, `src/core/config/${file}`);
    });
    
    // Move utils
    const utilFiles = fs.readdirSync(path.join(SRC_DIR, 'utils'));
    utilFiles.forEach(file => {
        moveFile(`src/utils/${file}`, `src/core/utils/${file}`);
    });
    
    log('\n✅ Phase 9 Complete!', 'green');
}

function phase10_cleanup() {
    log('\n🧹 PHASE 10: Cleanup Legacy Files', 'blue');
    log('==========================================\n', 'blue');
    
    log('⚠️  WARNING: This will delete legacy files!', 'yellow');
    log('Make sure all imports are updated first.', 'yellow');
    log('\nPlease manually review and delete:', 'yellow');
    log('  - src/routes/legacy/', 'yellow');
    log('  - routes/api/', 'yellow');
    log('  - services/paymentService.js', 'yellow');
    log('  - Old controllers, models, routes folders if empty', 'yellow');
    
    log('\n✅ Phase 10 Instructions Shown!', 'green');
}

// Main execution
const phase = process.argv[2];

if (!phase) {
    log('\n📘 MODULAR MIGRATION SCRIPT', 'blue');
    log('===========================\n', 'blue');
    log('Usage: node scripts/migrate-to-modular.js [phase]\n');
    log('Available phases:');
    log('  1. setup      - Create directory structure');
    log('  2. auth       - Migrate auth module');
    log('  3. bookings   - Migrate bookings module');
    log('  4. payments   - Migrate payments module');
    log('  5. rooms      - Migrate rooms module');
    log('  6. users      - Migrate users module');
    log('  7. admin      - Migrate admin module');
    log('  8. orders     - Migrate orders module');
    log('  9. core       - Migrate core utilities');
    log('  10. cleanup   - Show cleanup instructions\n');
    log('  all           - Run all phases (CAUTION!)\n');
    process.exit(0);
}

switch (phase) {
    case 'setup':
    case '1':
        phase1_setup();
        break;
    case 'auth':
    case '2':
        phase2_auth();
        break;
    case 'bookings':
    case '3':
        phase3_bookings();
        break;
    case 'payments':
    case '4':
        phase4_payments();
        break;
    case 'rooms':
    case '5':
        phase5_rooms();
        break;
    case 'users':
    case '6':
        phase6_users();
        break;
    case 'admin':
    case '7':
        phase7_admin();
        break;
    case 'orders':
    case '8':
        phase8_orders();
        break;
    case 'core':
    case '9':
        phase9_core();
        break;
    case 'cleanup':
    case '10':
        phase10_cleanup();
        break;
    case 'all':
        log('\n⚠️  WARNING: Running all phases!', 'yellow');
        log('This will restructure your entire application.\n', 'yellow');
        phase1_setup();
        phase2_auth();
        phase3_bookings();
        phase4_payments();
        phase5_rooms();
        phase6_users();
        phase7_admin();
        phase8_orders();
        phase9_core();
        phase10_cleanup();
        break;
    default:
        log(`\n❌ Unknown phase: ${phase}`, 'red');
        log('Run without arguments to see available phases.\n');
        process.exit(1);
}

log('\n📚 Next Steps:', 'blue');
log('  1. Update import paths in migrated files');
log('  2. Test endpoints: npm run dev');
log('  3. Run next phase when ready\n');
