/**
 * ================================================================
 * JUNRAI KARAOKE - CSS OPTIMIZATION UTILITIES
 * CSS purging, analysis, and optimization tools
 * ================================================================
 */

const fs = require('fs');
const path = require('path');

class CSSOptimizer {
    constructor(options = {}) {
        this.options = {
            sourceDir: options.sourceDir || path.join(__dirname, '../public'),
            templatesDir: options.templatesDir || path.join(__dirname, '../views'),
            ...options
        };
        
        this.usedClasses = new Set();
        this.unusedClasses = new Set();
        this.stats = {
            totalClasses: 0,
            usedClasses: 0,
            unusedClasses: 0,
            fileSize: {
                original: 0,
                optimized: 0
            }
        };
    }

    /**
     * Analyze CSS usage across templates
     */
    async analyzeUsage() {
        console.log('🔍 Analyzing CSS usage...');
        
        // Extract all CSS classes
        const cssClasses = await this.extractCSSClasses();
        
        // Find used classes in templates
        const usedClasses = await this.findUsedClasses();
        
        // Compare and generate report
        this.generateUsageReport(cssClasses, usedClasses);
        
        return {
            total: cssClasses.size,
            used: usedClasses.size,
            unused: cssClasses.size - usedClasses.size,
            unusedClasses: Array.from(cssClasses).filter(cls => !usedClasses.has(cls))
        };
    }

    /**
     * Extract all CSS class names from CSS files
     */
    async extractCSSClasses() {
        const classes = new Set();
        const cssFiles = await this.findCSSFiles();
        
        for (const cssFile of cssFiles) {
            const content = fs.readFileSync(cssFile, 'utf8');
            
            // Extract class selectors using regex
            const classMatches = content.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g);
            
            if (classMatches) {
                classMatches.forEach(match => {
                    // Remove the dot and add to set
                    const className = match.substring(1);
                    
                    // Filter out pseudo-classes and complex selectors
                    if (!className.includes(':') && !className.includes('[') && 
                        !className.includes('>') && !className.includes('+') &&
                        !className.includes('~') && !className.includes(' ')) {
                        classes.add(className);
                    }
                });
            }
        }
        
        console.log(`  📝 Found ${classes.size} CSS classes`);
        return classes;
    }

    /**
     * Find CSS classes used in templates
     */
    async findUsedClasses() {
        const usedClasses = new Set();
        const templateFiles = await this.findTemplateFiles();
        
        for (const templateFile of templateFiles) {
            const content = fs.readFileSync(templateFile, 'utf8');
            
            // Extract class attributes
            const classMatches = content.match(/class\s*=\s*["'][^"']*["']/g);
            
            if (classMatches) {
                classMatches.forEach(match => {
                    // Extract class names from class="..." or class='...'
                    const classNames = match
                        .replace(/class\s*=\s*["']/, '')
                        .replace(/["']$/, '')
                        .split(/\s+/)
                        .filter(cls => cls.trim().length > 0);
                    
                    classNames.forEach(className => usedClasses.add(className));
                });
            }

            // Also check for dynamic class generation in JavaScript
            const jsClassMatches = content.match(/classList\.(add|remove|toggle)\s*\(\s*["'][^"']*["']\s*\)/g);
            if (jsClassMatches) {
                jsClassMatches.forEach(match => {
                    const className = match.match(/["']([^"']*)["']/);
                    if (className && className[1]) {
                        usedClasses.add(className[1]);
                    }
                });
            }

            // Check for string class references
            const stringClassMatches = content.match(/["'][^"']*\b[a-z-]+\b[^"']*["']/g);
            if (stringClassMatches) {
                stringClassMatches.forEach(match => {
                    const potentialClasses = match.match(/\b[a-z][a-z0-9-]*[a-z0-9]\b/g);
                    if (potentialClasses) {
                        potentialClasses.forEach(cls => {
                            if (cls.includes('-') || cls.match(/^(btn|card|form|nav|modal|toast)/)) {
                                usedClasses.add(cls);
                            }
                        });
                    }
                });
            }
        }
        
        // Also scan JavaScript files for dynamic class usage
        const jsFiles = await this.findJSFiles();
        for (const jsFile of jsFiles) {
            const content = fs.readFileSync(jsFile, 'utf8');
            
            // Look for class-related patterns in JS
            const patterns = [
                /classList\.(add|remove|toggle)\s*\(\s*["']([^"']*)["']/g,
                /className\s*=\s*["']([^"']*)["']/g,
                /addClass\s*\(\s*["']([^"']*)["']/g,
                /removeClass\s*\(\s*["']([^"']*)["']/g,
                /hasClass\s*\(\s*["']([^"']*)["']/g
            ];
            
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    if (match[2]) {
                        match[2].split(/\s+/).forEach(cls => {
                            if (cls.trim()) usedClasses.add(cls.trim());
                        });
                    }
                }
            });
        }
        
        console.log(`  🎯 Found ${usedClasses.size} used classes`);
        return usedClasses;
    }

    /**
     * Find all CSS files
     */
    async findCSSFiles() {
        const cssFiles = [];
        const stylesheetsDir = path.join(this.options.sourceDir, 'stylesheets');
        
        if (fs.existsSync(stylesheetsDir)) {
            const files = fs.readdirSync(stylesheetsDir);
            files.forEach(file => {
                if (file.endsWith('.css')) {
                    cssFiles.push(path.join(stylesheetsDir, file));
                }
            });
        }
        
        return cssFiles;
    }

    /**
     * Find all template files
     */
    async findTemplateFiles() {
        const templateFiles = [];
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.endsWith('.ejs') || item.endsWith('.html')) {
                    templateFiles.push(fullPath);
                }
            });
        };
        
        scanDir(this.options.templatesDir);
        return templateFiles;
    }

    /**
     * Find all JavaScript files
     */
    async findJSFiles() {
        const jsFiles = [];
        const jsDir = path.join(this.options.sourceDir, 'javascripts');
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.endsWith('.js')) {
                    jsFiles.push(fullPath);
                }
            });
        };
        
        scanDir(jsDir);
        return jsFiles;
    }

    /**
     * Generate usage report
     */
    generateUsageReport(allClasses, usedClasses) {
        const unusedClasses = Array.from(allClasses).filter(cls => !usedClasses.has(cls));
        
        this.stats.totalClasses = allClasses.size;
        this.stats.usedClasses = usedClasses.size;
        this.stats.unusedClasses = unusedClasses.length;
        
        console.log('\n📊 CSS Usage Analysis:');
        console.log('═══════════════════════════════════════════');
        console.log(`Total Classes:    ${this.stats.totalClasses}`);
        console.log(`Used Classes:     ${this.stats.usedClasses} (${((this.stats.usedClasses / this.stats.totalClasses) * 100).toFixed(1)}%)`);
        console.log(`Unused Classes:   ${this.stats.unusedClasses} (${((this.stats.unusedClasses / this.stats.totalClasses) * 100).toFixed(1)}%)`);
        console.log('═══════════════════════════════════════════');
        
        if (unusedClasses.length > 0) {
            console.log('\n🗑️  Potentially Unused Classes:');
            console.log('─'.repeat(50));
            
            // Group by file/pattern for better readability
            const groupedClasses = this.groupUnusedClasses(unusedClasses);
            
            Object.keys(groupedClasses).forEach(group => {
                console.log(`\n${group}:`);
                groupedClasses[group].forEach(cls => {
                    console.log(`  • ${cls}`);
                });
            });
            
            console.log('\n💡 Note: Manual review recommended for dynamic classes');
        }
        
        return {
            total: this.stats.totalClasses,
            used: this.stats.usedClasses,
            unused: this.stats.unusedClasses,
            unusedList: unusedClasses
        };
    }

    /**
     * Group unused classes by patterns for better organization
     */
    groupUnusedClasses(unusedClasses) {
        const groups = {
            'Utility Classes': [],
            'Component Classes': [],
            'Layout Classes': [],
            'State Classes': [],
            'Theme Classes': [],
            'Other Classes': []
        };
        
        unusedClasses.forEach(cls => {
            if (cls.match(/^(m|p)[trblxy]?-\d+$|^text-|^bg-|^border-|^rounded|^shadow/)) {
                groups['Utility Classes'].push(cls);
            } else if (cls.match(/^(btn|card|modal|nav|form|table|alert)/)) {
                groups['Component Classes'].push(cls);
            } else if (cls.match(/^(container|row|col|flex|grid|d-)/)) {
                groups['Layout Classes'].push(cls);
            } else if (cls.match(/^(active|disabled|hidden|show|fade|loading)/)) {
                groups['State Classes'].push(cls);
            } else if (cls.match(/^(primary|secondary|success|danger|warning|info|light|dark)/)) {
                groups['Theme Classes'].push(cls);
            } else {
                groups['Other Classes'].push(cls);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    }

    /**
     * Generate optimized CSS by removing unused classes
     */
    async optimizeCSS(unusedClasses = []) {
        console.log('⚡ Optimizing CSS...');
        
        const cssFiles = await this.findCSSFiles();
        const optimizedFiles = [];
        
        for (const cssFile of cssFiles) {
            let content = fs.readFileSync(cssFile, 'utf8');
            const originalSize = content.length;
            
            // Remove unused class rules (simple approach)
            unusedClasses.forEach(className => {
                // Remove class selector and its rules
                const classRegex = new RegExp(`\\.${className}\\s*{[^}]*}`, 'g');
                content = content.replace(classRegex, '');
                
                // Remove from compound selectors (more complex)
                const compoundRegex = new RegExp(`\\.${className}(?=[,\\s:>+~])`, 'g');
                content = content.replace(compoundRegex, '');
            });
            
            // Clean up empty rules and extra whitespace
            content = content
                .replace(/\s*{\s*}/g, '') // Remove empty rules
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excess newlines
                .trim();
            
            const optimizedSize = content.length;
            const savings = originalSize - optimizedSize;
            
            // Write optimized file
            const outputPath = cssFile.replace('.css', '.optimized.css');
            fs.writeFileSync(outputPath, content);
            
            optimizedFiles.push({
                original: cssFile,
                optimized: outputPath,
                originalSize,
                optimizedSize,
                savings,
                savingsPercent: ((savings / originalSize) * 100).toFixed(1)
            });
            
            console.log(`  ✓ ${path.basename(cssFile)}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${((savings / originalSize) * 100).toFixed(1)}% saved)`);
        }
        
        return optimizedFiles;
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate CSS optimization report
     */
    async generateReport(outputPath = null) {
        const analysis = await this.analyzeUsage();
        const timestamp = new Date().toISOString();
        
        const report = {
            timestamp,
            summary: {
                totalClasses: analysis.total,
                usedClasses: analysis.used,
                unusedClasses: analysis.unused,
                utilizationRate: `${((analysis.used / analysis.total) * 100).toFixed(1)}%`
            },
            unusedClasses: analysis.unusedClasses,
            recommendations: this.generateRecommendations(analysis)
        };
        
        if (outputPath) {
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
            console.log(`📄 Report saved to: ${outputPath}`);
        }
        
        return report;
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.unused > analysis.total * 0.3) {
            recommendations.push({
                type: 'warning',
                message: 'High number of unused CSS classes detected (>30%)',
                action: 'Consider removing unused classes or implementing CSS purging'
            });
        }
        
        if (analysis.unused > 50) {
            recommendations.push({
                type: 'optimization',
                message: 'Large number of unused classes found',
                action: 'Review and remove unused utility classes and components'
            });
        }
        
        recommendations.push({
            type: 'info',
            message: 'CSS optimization completed',
            action: 'Monitor class usage regularly and maintain clean CSS'
        });
        
        return recommendations;
    }
}

// CLI interface
if (require.main === module) {
    const optimizer = new CSSOptimizer();
    
    const command = process.argv[2] || 'analyze';
    
    (async () => {
        switch (command) {
            case 'analyze':
                await optimizer.analyzeUsage();
                break;
                
            case 'optimize':
                const analysis = await optimizer.analyzeUsage();
                await optimizer.optimizeCSS(analysis.unusedClasses);
                break;
                
            case 'report':
                const outputPath = process.argv[3] || './css-optimization-report.json';
                await optimizer.generateReport(outputPath);
                break;
                
            default:
                console.log('Usage: node css-optimizer.js [analyze|optimize|report] [output-path]');
        }
    })();
}

module.exports = CSSOptimizer;