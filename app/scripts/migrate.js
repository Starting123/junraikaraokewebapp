#!/usr/bin/env node

/**
 * Migration script to help transition from old structure to new modular structure
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Migration Script: Transitioning to Modular Architecture');
console.log('='.repeat(60));

const migrationSteps = [
    {
        name: 'Update package.json dependencies',
        check: () => {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            return packageJson.dependencies.winston !== undefined;
        },
        action: () => {
            console.log('📦 Installing new dependencies...');
            console.log('Run: npm install winston');
        }
    },
    {
        name: 'Check if new modular structure exists',
        check: () => {
            return fs.existsSync('./src') && 
                   fs.existsSync('./src/config') && 
                   fs.existsSync('./src/models') &&
                   fs.existsSync('./src/services');
        },
        action: () => {
            console.log('✅ New modular structure detected');
        }
    },
    {
        name: 'Backup existing files',
        check: () => {
            return fs.existsSync('./backup');
        },
        action: () => {
            if (!fs.existsSync('./backup')) {
                fs.mkdirSync('./backup');
                console.log('📁 Created backup directory');
            }
        }
    },
    {
        name: 'Create logs directory',
        check: () => {
            return fs.existsSync('./logs');
        },
        action: () => {
            if (!fs.existsSync('./logs')) {
                fs.mkdirSync('./logs');
                console.log('📁 Created logs directory');
            }
        }
    }
];

console.log('Checking migration requirements...\n');

let allPassed = true;

migrationSteps.forEach((step, index) => {
    const status = step.check();
    console.log(`${index + 1}. ${step.name}: ${status ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!status) {
        allPassed = false;
        step.action();
    }
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
    console.log('🎉 Migration check completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Update your .env file with new configuration');
    console.log('3. Test the new API endpoints');
    console.log('4. Run: npm run dev:src (for new structure)');
} else {
    console.log('⚠️  Some migration steps need attention');
    console.log('\nPlease address the failed checks and run this script again');
}

console.log('\n📚 Documentation: ./docs/MODULAR_ARCHITECTURE.md');
console.log('🔗 Health check: http://localhost:3000/health (when running)');
console.log('🔗 API info: http://localhost:3000/api (when running)');

module.exports = {
    migrationSteps
};