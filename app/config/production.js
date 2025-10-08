/**
 * ================================================================
 * JUNRAI KARAOKE - PRODUCTION CONFIGURATION
 * Performance optimization and production settings
 * ================================================================ 
 */

const compression = require('compression');
const path = require('path');
const fs = require('fs');

class ProductionConfig {
    constructor(app) {
        this.app = app;
        this.manifestPath = path.join(__dirname, '../public/dist/manifest.json');
        this.manifest = null;
        this.loadManifest();
    }

    /**
     * Load build manifest
     */
    loadManifest() {
        try {
            if (fs.existsSync(this.manifestPath)) {
                const manifestData = fs.readFileSync(this.manifestPath, 'utf8');
                this.manifest = JSON.parse(manifestData);
                console.log('📋 Build manifest loaded');
            }
        } catch (error) {
            console.warn('⚠️  Failed to load build manifest:', error.message);
        }
    }

    /**
     * Apply production optimizations
     */
    configure() {
        if (process.env.NODE_ENV === 'production') {
            this.enableCompression();
            this.enableCaching();
            this.optimizeStatic();
            this.setupSecurityHeaders();
            console.log('⚡ Production optimizations enabled');
        }
    }

    /**
     * Enable gzip compression
     */
    enableCompression() {
        this.app.use(compression({
            level: 6,
            threshold: 1000,
            filter: (req, res) => {
                // Don't compress if the client doesn't accept gzip
                if (req.headers['x-no-compression']) {
                    return false;
                }
                // Use compression filter
                return compression.filter(req, res);
            }
        }));
        
        console.log('  ✅ Gzip compression enabled');
    }

    /**
     * Enable aggressive caching for static assets
     */
    enableCaching() {
        const oneYear = 31536000; // 1 year in seconds
        const oneMonth = 2592000; // 1 month in seconds
        const oneWeek = 604800;   // 1 week in seconds

        // Cache static assets
        this.app.use('/dist', (req, res, next) => {
            // Set cache headers for built assets
            res.set({
                'Cache-Control': `public, max-age=${oneYear}, immutable`,
                'ETag': false // Disable ETag since we use content hashing
            });
            next();
        });

        // Cache images with shorter expiry
        this.app.use('/images', (req, res, next) => {
            res.set({
                'Cache-Control': `public, max-age=${oneMonth}`,
            });
            next();
        });

        // Cache fonts with long expiry
        this.app.use('/fonts', (req, res, next) => {
            res.set({
                'Cache-Control': `public, max-age=${oneYear}`,
            });
            next();
        });

        // Shorter cache for other static content
        this.app.use((req, res, next) => {
            if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
                res.set({
                    'Cache-Control': `public, max-age=${oneWeek}`,
                });
            }
            next();
        });
        
        console.log('  ✅ Static asset caching enabled');
    }

    /**
     * Optimize static file serving
     */
    optimizeStatic() {
        // Serve pre-built assets first
        if (fs.existsSync(path.join(__dirname, '../public/dist'))) {
            this.app.use('/dist', require('express').static(
                path.join(__dirname, '../public/dist'),
                {
                    maxAge: '1y',
                    immutable: true,
                    setHeaders: (res, path) => {
                        // Add integrity check for built files
                        if (this.manifest && this.manifest.integrity) {
                            if (path.includes('junrai.min.css') && this.manifest.integrity.css) {
                                res.set('Integrity', this.manifest.integrity.css);
                            }
                            if (path.includes('junrai.min.js') && this.manifest.integrity.js) {
                                res.set('Integrity', this.manifest.integrity.js);
                            }
                        }
                    }
                }
            ));
        }
        
        console.log('  ✅ Optimized static file serving');
    }

    /**
     * Setup security headers
     */
    setupSecurityHeaders() {
        this.app.use((req, res, next) => {
            // Security headers
            res.set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            });

            // CSP for production
            if (process.env.NODE_ENV === 'production') {
                const csp = [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdnjs.cloudflare.com https://fonts.googleapis.com",
                    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
                    "img-src 'self' data: https:",
                    "connect-src 'self' https://api.stripe.com",
                    "frame-src https://js.stripe.com",
                ].join('; ');
                
                res.set('Content-Security-Policy', csp);
            }
            
            next();
        });
        
        console.log('  ✅ Security headers configured');
    }

    /**
     * Get asset URL with cache busting
     */
    getAssetUrl(type, filename) {
        if (!this.manifest || !this.manifest.files) {
            return `/stylesheets/${filename}`;
        }

        switch (type) {
            case 'css':
                return this.manifest.files.css.main;
            case 'js':
                return this.manifest.files.js.main;
            default:
                return `/${type}/${filename}`;
        }
    }

    /**
     * Template helper for assets
     */
    setupTemplateHelpers() {
        // Add helper to res.locals for all requests
        this.app.use((req, res, next) => {
            res.locals.asset = (type, filename) => {
                return this.getAssetUrl(type, filename);
            };
            
            res.locals.isProduction = process.env.NODE_ENV === 'production';
            res.locals.buildVersion = this.manifest ? this.manifest.version : 'dev';
            
            next();
        });
        
        console.log('  ✅ Template helpers configured');
    }

    /**
     * Setup error handling for production
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            res.status(404).render('error', {
                title: 'ไม่พบหน้าที่ต้องการ',
                message: 'ขออภัย ไม่พบหน้าที่คุณกำลังมองหา',
                error: process.env.NODE_ENV === 'development' ? { status: 404 } : {}
            });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            // Log error in production
            if (process.env.NODE_ENV === 'production') {
                console.error('Application Error:', {
                    message: err.message,
                    stack: err.stack,
                    url: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            // Set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = process.env.NODE_ENV === 'development' ? err : {};

            // Render error page
            res.status(err.status || 500);
            res.render('error', {
                title: 'เกิดข้อผิดพลาด',
                message: process.env.NODE_ENV === 'production' ? 
                    'เกิดข้อผิดพลาดระหว่างการประมวลผล' : err.message
            });
        });
        
        console.log('  ✅ Error handling configured');
    }

    /**
     * Monitor performance
     */
    setupPerformanceMonitoring() {
        // Request timing
        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            
            // Log slow requests in production
            const originalSend = res.send;
            res.send = function(data) {
                const duration = Date.now() - req.startTime;
                
                if (duration > 1000) { // Log requests taking more than 1 second
                    console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
                }
                
                originalSend.call(this, data);
            };
            
            next();
        });
        
        console.log('  ✅ Performance monitoring enabled');
    }

    /**
     * Initialize all production configurations
     */
    init() {
        this.configure();
        this.setupTemplateHelpers();
        this.setupErrorHandling();
        this.setupPerformanceMonitoring();
        
        return this;
    }
}

module.exports = ProductionConfig;