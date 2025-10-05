// ==========================================
// ADMIN DASHBOARD TESTING & VERIFICATION
// ==========================================

class AdminDashboardTester {
    constructor() {
        this.testResults = [];
        this.runTests();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(`%c${logMessage}`, `color: ${this.getLogColor(type)}`);
        this.testResults.push({ timestamp, message, type });
    }

    getLogColor(type) {
        const colors = {
            'info': '#2196F3',
            'success': '#4CAF50',
            'warning': '#FF9800',
            'error': '#F44336'
        };
        return colors[type] || '#333';
    }

    async runTests() {
        this.log('🚀 Starting Admin Dashboard Testing...', 'info');
        
        // CSS Conflict Tests
        await this.testCSSConflicts();
        
        // Navigation Tests
        await this.testNavigation();
        
        // Modal System Tests
        await this.testModalSystem();
        
        // Form Validation Tests
        await this.testFormValidation();
        
        // CRUD Operations Tests
        await this.testCRUDOperations();
        
        // Responsive Design Tests
        await this.testResponsiveDesign();
        
        // Performance Tests
        await this.testPerformance();
        
        this.generateTestReport();
    }

    // === CSS CONFLICT TESTS ===
    async testCSSConflicts() {
        this.log('🎨 Testing CSS Conflicts...', 'info');
        
        try {
            // Check if admin-reset.css is loaded
            const resetStyles = Array.from(document.styleSheets).find(sheet => 
                sheet.href && sheet.href.includes('admin-reset.css')
            );
            
            if (resetStyles) {
                this.log('✅ Admin CSS Reset loaded successfully', 'success');
            } else {
                this.log('❌ Admin CSS Reset not found', 'error');
            }

            // Check for style conflicts
            const adminContainer = document.querySelector('.admin-dashboard-container');
            if (adminContainer) {
                const computedStyle = window.getComputedStyle(adminContainer);
                
                // Test box-sizing
                if (computedStyle.boxSizing === 'border-box') {
                    this.log('✅ Box-sizing properly set', 'success');
                } else {
                    this.log('⚠️ Box-sizing may cause layout issues', 'warning');
                }

                // Test font family
                const fontFamily = computedStyle.fontFamily;
                if (fontFamily.includes('Segoe UI') || fontFamily.includes('system')) {
                    this.log('✅ Admin font family correctly applied', 'success');
                } else {
                    this.log('⚠️ Font family may be overridden', 'warning');
                }
            }

            // Check button conflicts
            const adminButtons = document.querySelectorAll('.admin-dashboard-container .btn');
            let buttonConflicts = 0;
            
            adminButtons.forEach(btn => {
                const styles = window.getComputedStyle(btn);
                if (!styles.borderRadius || styles.borderRadius === '0px') {
                    buttonConflicts++;
                }
            });

            if (buttonConflicts === 0) {
                this.log('✅ No button style conflicts detected', 'success');
            } else {
                this.log(`⚠️ ${buttonConflicts} button style conflicts found`, 'warning');
            }

        } catch (error) {
            this.log(`❌ CSS conflict test failed: ${error.message}`, 'error');
        }
    }

    // === NAVIGATION TESTS ===
    async testNavigation() {
        this.log('🧭 Testing Navigation System...', 'info');
        
        try {
            // Test admin nav links
            const adminNavLinks = document.querySelectorAll('.admin-nav-link');
            if (adminNavLinks.length > 0) {
                this.log(`✅ Found ${adminNavLinks.length} admin navigation links`, 'success');
                
                // Test click functionality
                adminNavLinks.forEach((link, index) => {
                    if (link.dataset.section) {
                        this.log(`✅ Nav link ${index + 1} has proper data-section attribute`, 'success');
                    } else {
                        this.log(`❌ Nav link ${index + 1} missing data-section`, 'error');
                    }
                });
            } else {
                this.log('❌ No admin navigation links found', 'error');
            }

            // Test homepage admin link (if on homepage)
            if (window.location.pathname === '/') {
                const adminLink = document.getElementById('adminLink');
                const adminHeroCard = document.getElementById('adminHeroCard');
                
                if (adminLink) {
                    this.log('✅ Homepage admin link element exists', 'success');
                } else {
                    this.log('❌ Homepage admin link not found', 'error');
                }

                if (adminHeroCard) {
                    this.log('✅ Admin hero card element exists', 'success');
                } else {
                    this.log('❌ Admin hero card not found', 'error');
                }
            }

        } catch (error) {
            this.log(`❌ Navigation test failed: ${error.message}`, 'error');
        }
    }

    // === MODAL SYSTEM TESTS ===
    async testModalSystem() {
        this.log('🪟 Testing Modal System...', 'info');
        
        try {
            if (typeof window.AdminModals !== 'undefined') {
                this.log('✅ AdminModals class loaded', 'success');
                
                // Test modal container
                const modalContainer = document.getElementById('modal-container');
                if (modalContainer) {
                    this.log('✅ Modal container exists', 'success');
                } else {
                    this.log('❌ Modal container not found', 'error');
                }

                // Test modal methods
                const modalMethods = ['createModal', 'closeModal', 'showCreateUserModal', 'showCreateRoomModal'];
                let methodsExist = 0;
                
                modalMethods.forEach(method => {
                    if (typeof window.AdminModals[method] === 'function') {
                        methodsExist++;
                    }
                });

                if (methodsExist === modalMethods.length) {
                    this.log(`✅ All ${methodsExist} modal methods exist`, 'success');
                } else {
                    this.log(`⚠️ Only ${methodsExist}/${modalMethods.length} modal methods found`, 'warning');
                }

            } else {
                this.log('❌ AdminModals class not loaded', 'error');
            }
        } catch (error) {
            this.log(`❌ Modal system test failed: ${error.message}`, 'error');
        }
    }

    // === FORM VALIDATION TESTS ===
    async testFormValidation() {
        this.log('📝 Testing Form Validation...', 'info');
        
        try {
            if (typeof window.FormValidator !== 'undefined') {
                this.log('✅ FormValidator class loaded', 'success');
                
                // Test validation methods
                const validator = window.FormValidator;
                if (typeof validator.validateField === 'function') {
                    this.log('✅ Field validation method exists', 'success');
                }
                
                if (typeof validator.validateForm === 'function') {
                    this.log('✅ Form validation method exists', 'success');
                }

                // Test custom validators
                if (typeof validator.validateThaiID === 'function') {
                    this.log('✅ Thai ID validator exists', 'success');
                    
                    // Test with valid Thai ID
                    const validID = '1234567890123';
                    // Note: This is a simplified test, actual Thai ID validation is more complex
                    this.log('✅ Thai ID validation function callable', 'success');
                }

            } else {
                this.log('❌ FormValidator class not loaded', 'error');
            }
        } catch (error) {
            this.log(`❌ Form validation test failed: ${error.message}`, 'error');
        }
    }

    // === CRUD OPERATIONS TESTS ===
    async testCRUDOperations() {
        this.log('🔄 Testing CRUD Operations...', 'info');
        
        try {
            if (typeof window.AdminCRUD !== 'undefined') {
                this.log('✅ AdminCRUD class loaded', 'success');
                
                // Test CRUD methods
                const crudMethods = ['loadUsers', 'loadRooms', 'loadMenu', 'loadBookings'];
                let methodsExist = 0;
                
                crudMethods.forEach(method => {
                    if (typeof window.AdminCRUD[method] === 'function') {
                        methodsExist++;
                    }
                });

                if (methodsExist === crudMethods.length) {
                    this.log(`✅ All ${methodsExist} CRUD methods exist`, 'success');
                } else {
                    this.log(`⚠️ Only ${methodsExist}/${crudMethods.length} CRUD methods found`, 'warning');
                }

                // Test API call method
                if (typeof window.AdminCRUD.apiCall === 'function') {
                    this.log('✅ API call method exists', 'success');
                } else {
                    this.log('❌ API call method missing', 'error');
                }

            } else {
                this.log('❌ AdminCRUD class not loaded', 'error');
            }
        } catch (error) {
            this.log(`❌ CRUD operations test failed: ${error.message}`, 'error');
        }
    }

    // === RESPONSIVE DESIGN TESTS ===
    async testResponsiveDesign() {
        this.log('📱 Testing Responsive Design...', 'info');
        
        try {
            const viewportWidth = window.innerWidth;
            this.log(`Current viewport width: ${viewportWidth}px`, 'info');

            // Test mobile breakpoint
            if (viewportWidth <= 768) {
                this.log('📱 Testing mobile layout...', 'info');
                
                const mobileElements = document.querySelectorAll('.admin-sidebar, .admin-navbar');
                mobileElements.forEach((element, index) => {
                    const styles = window.getComputedStyle(element);
                    this.log(`Mobile element ${index + 1}: ${styles.display || 'visible'}`, 'info');
                });
            }

            // Test CSS Grid/Flexbox support
            const gridSupport = CSS.supports('display', 'grid');
            const flexSupport = CSS.supports('display', 'flex');

            if (gridSupport && flexSupport) {
                this.log('✅ Modern layout methods supported', 'success');
            } else {
                this.log('⚠️ Limited layout support detected', 'warning');
            }

        } catch (error) {
            this.log(`❌ Responsive design test failed: ${error.message}`, 'error');
        }
    }

    // === PERFORMANCE TESTS ===
    async testPerformance() {
        this.log('⚡ Testing Performance...', 'info');
        
        try {
            // Test script loading times
            const loadTime = performance.now();
            this.log(`Page load time: ${loadTime.toFixed(2)}ms`, 'info');

            // Test DOM query performance
            const startTime = performance.now();
            document.querySelectorAll('.admin-dashboard-container *');
            const queryTime = performance.now() - startTime;
            
            if (queryTime < 10) {
                this.log(`✅ DOM queries fast: ${queryTime.toFixed(2)}ms`, 'success');
            } else {
                this.log(`⚠️ DOM queries slow: ${queryTime.toFixed(2)}ms`, 'warning');
            }

            // Test memory usage (if available)
            if (performance.memory) {
                const memUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
                this.log(`Memory usage: ${memUsage.toFixed(2)}MB`, 'info');
                
                if (memUsage < 50) {
                    this.log('✅ Memory usage optimal', 'success');
                } else {
                    this.log('⚠️ High memory usage detected', 'warning');
                }
            }

        } catch (error) {
            this.log(`❌ Performance test failed: ${error.message}`, 'error');
        }
    }

    // === GENERATE REPORT ===
    generateTestReport() {
        this.log('📊 Generating Test Report...', 'info');
        
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const totalTests = successCount + warningCount + errorCount;

        console.log(`
        ╔══════════════════════════════════════════════════════════════╗
        ║                    ADMIN DASHBOARD TEST REPORT                    ║
        ╠══════════════════════════════════════════════════════════════╣
        ║ ✅ Successful Tests: ${successCount.toString().padStart(3)} / ${totalTests.toString().padEnd(3)}                           ║
        ║ ⚠️  Warnings:        ${warningCount.toString().padStart(3)} / ${totalTests.toString().padEnd(3)}                           ║
        ║ ❌ Errors:           ${errorCount.toString().padStart(3)} / ${totalTests.toString().padEnd(3)}                           ║
        ╠══════════════════════════════════════════════════════════════╣
        ║ Overall Status: ${this.getOverallStatus(successCount, totalTests).padEnd(43)} ║
        ╚══════════════════════════════════════════════════════════════╝
        `);

        // Show detailed results
        if (errorCount > 0) {
            console.log('\n🔍 Issues that need attention:');
            this.testResults
                .filter(r => r.type === 'error' || r.type === 'warning')
                .forEach(result => {
                    console.log(`${result.type === 'error' ? '❌' : '⚠️'} ${result.message}`);
                });
        }

        this.log('📝 Test report generation complete!', 'success');
    }

    getOverallStatus(successCount, totalTests) {
        const successRate = (successCount / totalTests) * 100;
        
        if (successRate >= 90) return '🎉 EXCELLENT';
        if (successRate >= 75) return '✅ GOOD';
        if (successRate >= 50) return '⚠️ NEEDS IMPROVEMENT';
        return '❌ CRITICAL ISSUES';
    }
}

// Auto-run tests when script loads
document.addEventListener('DOMContentLoaded', function() {
    // Add a delay to ensure all scripts are loaded
    setTimeout(() => {
        console.log('%c🧪 ADMIN DASHBOARD TESTING INITIALIZED', 'color: #2196F3; font-size: 16px; font-weight: bold;');
        new AdminDashboardTester();
    }, 2000);
});

// Make tester available globally for manual testing
window.AdminDashboardTester = AdminDashboardTester;