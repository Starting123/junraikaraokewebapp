/**
 * ================================================================
 * JUNRAI KARAOKE - ASSET BUILD PIPELINE
 * Production optimization and asset consolidation system
 * ================================================================
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('csso');
const terser = require('terser');

class JunraiAssetPipeline {
    constructor(options = {}) {
        this.options = {
            sourceDir: options.sourceDir || path.join(__dirname, '../public'),
            buildDir: options.buildDir || path.join(__dirname, '../public/dist'),
            cssFiles: options.cssFiles || [
                'stylesheets/theme.css',
                'stylesheets/global.css',
                'stylesheets/index.css',
                'stylesheets/auth.css',
                'stylesheets/bookings.css',
                'stylesheets/rooms.css',
                'stylesheets/contact.css',
                'stylesheets/dashboard.css',
                'stylesheets/payment.css',
                'stylesheets/admin.css'
            ],
            jsFiles: options.jsFiles || [
                'javascripts/core/utils.js',
                'javascripts/core/auth.js',
                'javascripts/modules/form-validator.js',
                'javascripts/modules/booking.js',
                'javascripts/modules/admin-dashboard.js',
                'javascripts/dashboard.js',
                'javascripts/payment.js',
                'javascripts/timeSlotBooking.js',
                'javascripts/contact.js'
            ],
            enableMinification: options.enableMinification !== false,
            enableSourceMaps: options.enableSourceMaps !== false,
            enableCompression: options.enableCompression !== false
        };
        
        this.stats = {
            originalSize: 0,
            minifiedSize: 0,
            compressionRatio: 0,
            files: {
                css: { original: 0, minified: 0 },
                js: { original: 0, minified: 0 }
            }
        };
    }

    /**
     * Initialize build pipeline
     */
    async init() {
        try {
            await this.ensureBuildDirectory();
            console.log('🚀 Junrai Asset Pipeline initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize asset pipeline:', error.message);
            return false;
        }
    }

    /**
     * Ensure build directory exists
     */
    async ensureBuildDirectory() {
        if (!fs.existsSync(this.options.buildDir)) {
            fs.mkdirSync(this.options.buildDir, { recursive: true });
        }
        
        // Create subdirectories
        const subdirs = ['css', 'js', 'images', 'fonts'];
        subdirs.forEach(dir => {
            const dirPath = path.join(this.options.buildDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    /**
     * Build all assets
     */
    async buildAll() {
        console.log('🔨 Starting asset build process...');
        
        const startTime = Date.now();
        
        try {
            // Build CSS
            await this.buildCSS();
            
            // Build JavaScript
            await this.buildJS();
            
            // Optimize images
            await this.optimizeImages();
            
            // Copy fonts
            await this.copyFonts();
            
            // Generate manifest
            await this.generateManifest();
            
            // Calculate stats
            this.calculateStats();
            
            const buildTime = Date.now() - startTime;
            console.log(`✅ Build completed in ${buildTime}ms`);
            this.printStats();
            
            return true;
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            return false;
        }
    }

    /**
     * Build CSS assets
     */
    async buildCSS() {
        console.log('📝 Building CSS assets...');
        
        let combinedCSS = '';
        let originalSize = 0;
        
        // CSS header with build info
        combinedCSS += `/*!\n`;
        combinedCSS += ` * Junrai Karaoke - Consolidated Styles\n`;
        combinedCSS += ` * Built on: ${new Date().toISOString()}\n`;
        combinedCSS += ` * Build system: Junrai Asset Pipeline\n`;
        combinedCSS += ` */\n\n`;

        // Process each CSS file
        for (const cssFile of this.options.cssFiles) {
            const filePath = path.join(this.options.sourceDir, cssFile);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                originalSize += content.length;
                
                // Add file separator comment
                combinedCSS += `/* ============= ${path.basename(cssFile)} ============= */\n`;
                combinedCSS += content;
                combinedCSS += '\n\n';
                
                console.log(`  ✓ Processed ${cssFile} (${this.formatBytes(content.length)})`);
            } else {
                console.warn(`  ⚠️  File not found: ${cssFile}`);
            }
        }

        // Write unminified version
        const unminifiedPath = path.join(this.options.buildDir, 'css', 'junrai.css');
        fs.writeFileSync(unminifiedPath, combinedCSS);
        
        // Minify if enabled
        let minifiedCSS = combinedCSS;
        if (this.options.enableMinification) {
            try {
                const result = minify(combinedCSS, {
                    restructure: true,
                    comments: false
                });
                minifiedCSS = result.css;
            } catch (error) {
                console.warn('⚠️  CSS minification failed, using unminified version');
            }
        }

        // Write minified version
        const minifiedPath = path.join(this.options.buildDir, 'css', 'junrai.min.css');
        fs.writeFileSync(minifiedPath, minifiedCSS);
        
        // Update stats
        this.stats.files.css.original = originalSize;
        this.stats.files.css.minified = minifiedCSS.length;
        
        console.log(`  ✅ CSS build complete: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedCSS.length)}`);
    }

    /**
     * Build JavaScript assets
     */
    async buildJS() {
        console.log('⚙️  Building JavaScript assets...');
        
        let combinedJS = '';
        let originalSize = 0;
        
        // JS header with build info
        combinedJS += `/*!\n`;
        combinedJS += ` * Junrai Karaoke - Consolidated Scripts\n`;
        combinedJS += ` * Built on: ${new Date().toISOString()}\n`;
        combinedJS += ` * Build system: Junrai Asset Pipeline\n`;
        combinedJS += ` */\n\n`;

        // Process each JS file
        for (const jsFile of this.options.jsFiles) {
            const filePath = path.join(this.options.sourceDir, jsFile);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                originalSize += content.length;
                
                // Add file separator comment
                combinedJS += `/* ============= ${path.basename(jsFile)} ============= */\n`;
                combinedJS += content;
                combinedJS += '\n\n';
                
                console.log(`  ✓ Processed ${jsFile} (${this.formatBytes(content.length)})`);
            } else {
                console.warn(`  ⚠️  File not found: ${jsFile}`);
            }
        }

        // Write unminified version
        const unminifiedPath = path.join(this.options.buildDir, 'js', 'junrai.js');
        fs.writeFileSync(unminifiedPath, combinedJS);
        
        // Minify if enabled
        let minifiedJS = combinedJS;
        if (this.options.enableMinification) {
            try {
                const result = await terser.minify(combinedJS, {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                        pure_funcs: ['console.log', 'console.debug']
                    },
                    mangle: {
                        reserved: ['JunraiUtils', 'JunraiAuth', 'JunraiBooking', 'JunraiFormValidator', 'JunraiAdminDashboard']
                    }
                });
                
                if (result.code) {
                    minifiedJS = result.code;
                }
            } catch (error) {
                console.warn('⚠️  JavaScript minification failed, using unminified version');
            }
        }

        // Write minified version
        const minifiedPath = path.join(this.options.buildDir, 'js', 'junrai.min.js');
        fs.writeFileSync(minifiedPath, minifiedJS);
        
        // Update stats
        this.stats.files.js.original = originalSize;
        this.stats.files.js.minified = minifiedJS.length;
        
        console.log(`  ✅ JavaScript build complete: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedJS.length)}`);
    }

    /**
     * Optimize images
     */
    async optimizeImages() {
        console.log('🖼️  Optimizing images...');
        
        const imagesDir = path.join(this.options.sourceDir, 'images');
        const outputDir = path.join(this.options.buildDir, 'images');
        
        if (!fs.existsSync(imagesDir)) {
            console.log('  ℹ️  No images directory found, skipping...');
            return;
        }

        // Copy images (in a real-world scenario, you'd use imagemin or similar)
        await this.copyDirectory(imagesDir, outputDir);
        console.log('  ✅ Images copied to build directory');
    }

    /**
     * Copy fonts
     */
    async copyFonts() {
        console.log('🔤 Copying fonts...');
        
        const fontsDir = path.join(this.options.sourceDir, 'fonts');
        const outputDir = path.join(this.options.buildDir, 'fonts');
        
        if (!fs.existsSync(fontsDir)) {
            console.log('  ℹ️  No fonts directory found, skipping...');
            return;
        }

        await this.copyDirectory(fontsDir, outputDir);
        console.log('  ✅ Fonts copied to build directory');
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const items = fs.readdirSync(src);
        
        for (const item of items) {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            if (fs.statSync(srcPath).isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Generate build manifest
     */
    async generateManifest() {
        const manifest = {
            buildTime: new Date().toISOString(),
            version: this.generateVersion(),
            files: {
                css: {
                    main: '/dist/css/junrai.min.css',
                    unminified: '/dist/css/junrai.css'
                },
                js: {
                    main: '/dist/js/junrai.min.js',
                    unminified: '/dist/js/junrai.js'
                }
            },
            stats: this.stats,
            integrity: {
                css: await this.generateIntegrity(path.join(this.options.buildDir, 'css', 'junrai.min.css')),
                js: await this.generateIntegrity(path.join(this.options.buildDir, 'js', 'junrai.min.js'))
            }
        };

        const manifestPath = path.join(this.options.buildDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('  ✅ Build manifest generated');
    }

    /**
     * Generate version hash
     */
    generateVersion() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Generate SRI integrity hash
     */
    async generateIntegrity(filePath) {
        if (!fs.existsSync(filePath)) return null;
        
        const crypto = require('crypto');
        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha384').update(content).digest('base64');
        return `sha384-${hash}`;
    }

    /**
     * Calculate build statistics
     */
    calculateStats() {
        this.stats.originalSize = this.stats.files.css.original + this.stats.files.js.original;
        this.stats.minifiedSize = this.stats.files.css.minified + this.stats.files.js.minified;
        this.stats.compressionRatio = ((this.stats.originalSize - this.stats.minifiedSize) / this.stats.originalSize * 100).toFixed(1);
    }

    /**
     * Print build statistics
     */
    printStats() {
        console.log('\n📊 Build Statistics:');
        console.log('────────────────────────────────');
        console.log(`Original size:  ${this.formatBytes(this.stats.originalSize)}`);
        console.log(`Minified size:  ${this.formatBytes(this.stats.minifiedSize)}`);
        console.log(`Savings:        ${this.formatBytes(this.stats.originalSize - this.stats.minifiedSize)} (${this.stats.compressionRatio}%)`);
        console.log('\nBreakdown:');
        console.log(`  CSS: ${this.formatBytes(this.stats.files.css.original)} → ${this.formatBytes(this.stats.files.css.minified)}`);
        console.log(`  JS:  ${this.formatBytes(this.stats.files.js.original)} → ${this.formatBytes(this.stats.files.js.minified)}`);
        console.log('────────────────────────────────\n');
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Watch for changes (development mode)
     */
    watch() {
        console.log('👀 Watching for file changes...');
        
        const chokidar = require('chokidar');
        const watchPaths = [
            path.join(this.options.sourceDir, 'stylesheets'),
            path.join(this.options.sourceDir, 'javascripts')
        ];

        const watcher = chokidar.watch(watchPaths, {
            ignored: /node_modules/,
            persistent: true
        });

        let buildTimeout;
        
        watcher.on('change', (filePath) => {
            console.log(`📝 File changed: ${path.relative(this.options.sourceDir, filePath)}`);
            
            // Debounce builds
            clearTimeout(buildTimeout);
            buildTimeout = setTimeout(() => {
                this.buildAll();
            }, 500);
        });

        return watcher;
    }

    /**
     * Clean build directory
     */
    async clean() {
        console.log('🧹 Cleaning build directory...');
        
        if (fs.existsSync(this.options.buildDir)) {
            fs.rmSync(this.options.buildDir, { recursive: true, force: true });
        }
        
        console.log('  ✅ Build directory cleaned');
    }
}

// CLI interface
if (require.main === module) {
    const pipeline = new JunraiAssetPipeline();
    
    const command = process.argv[2] || 'build';
    
    (async () => {
        await pipeline.init();
        
        switch (command) {
            case 'build':
                await pipeline.buildAll();
                break;
                
            case 'watch':
                await pipeline.buildAll();
                pipeline.watch();
                break;
                
            case 'clean':
                await pipeline.clean();
                break;
                
            default:
                console.log('Usage: node build-pipeline.js [build|watch|clean]');
        }
    })();
}

module.exports = JunraiAssetPipeline;