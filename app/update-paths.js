/**
 * Path Update Helper Script
 * ช่วยอัปเดต path ในไฟล์ view จากโครงสร้างเก่าไปใหม่
 */

const fs = require('fs');
const path = require('path');

// Path mappings for migration
const pathMappings = {
    // CSS files
    '/stylesheets/': '/css/',
    
    // JS files that were incorrectly in stylesheets
    '/stylesheets/admin.js': '/js/admin.js',
    '/stylesheets/dashboard.js': '/js/dashboard.js',
    '/stylesheets/contact.js': '/js/contact.js',
    '/stylesheets/payment.js': '/js/payment.js',
    
    // JS files from javascripts folder
    '/javascripts/timeSlotBooking.js': '/js/legacy/timeSlotBooking.js',
    '/javascripts/modules/': '/js/legacy/modules/'
};

/**
 * Update paths in a single file
 */
function updatePathsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // Apply all path mappings
        for (const [oldPath, newPath] of Object.entries(pathMappings)) {
            if (content.includes(oldPath)) {
                content = content.replaceAll(oldPath, newPath);
                updated = true;
                console.log(`Updated ${oldPath} → ${newPath} in ${filePath}`);
            }
        }
        
        // Write back if changed
        if (updated) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated: ${filePath}`);
        } else {
            console.log(`ℹ️ No changes needed: ${filePath}`);
        }
        
        return updated;
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Process all EJS files in views directory
 */
function updateViewFiles() {
    const viewsDir = path.join(__dirname, 'views');
    
    if (!fs.existsSync(viewsDir)) {
        console.error('❌ Views directory not found');
        return;
    }
    
    const files = fs.readdirSync(viewsDir);
    const ejsFiles = files.filter(file => file.endsWith('.ejs'));
    
    console.log(`🔄 Processing ${ejsFiles.length} EJS files...\n`);
    
    let totalUpdated = 0;
    
    for (const file of ejsFiles) {
        const filePath = path.join(viewsDir, file);
        if (updatePathsInFile(filePath)) {
            totalUpdated++;
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Files processed: ${ejsFiles.length}`);
    console.log(`   Files updated: ${totalUpdated}`);
    console.log(`   Files unchanged: ${ejsFiles.length - totalUpdated}`);
}

// Show usage instructions
console.log('🚀 Path Update Helper for Modular Architecture Migration');
console.log('This script will update asset paths in EJS view files\n');

console.log('📋 Mappings to be applied:');
for (const [oldPath, newPath] of Object.entries(pathMappings)) {
    console.log(`   ${oldPath} → ${newPath}`);
}
console.log('');

// Run the update
updateViewFiles();

console.log('\n⚠️ Next Steps:');
console.log('1. Update your Express app.js to serve static files from new paths:');
console.log('   app.use("/css", express.static(path.join(__dirname, "src/public/css")));');
console.log('   app.use("/js", express.static(path.join(__dirname, "src/public/js")));');
console.log('');
console.log('2. Test your application to ensure all assets load correctly');
console.log('3. Consider removing old stylesheets folder after testing');