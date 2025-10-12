/**
 * Main Application Entry Point
 * Initializes all modules and sets up the application
 */

import { $, $$, on, ready } from './core/dom.js';
import { emit, on as eventOn, showToast } from './core/events.js';
import { apiGet, apiPost, setToken } from './core/api.js';

class JunraiKaraokeApp {
    constructor() {
        this.initialized = false;
        this.modules = {};
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        if (this.initialized) return;
        
        // Wait for DOM to be ready
        window.DOM.ready(() => {
            this.setupGlobalErrorHandling();
            this.initializeModules();
            this.setupGlobalEventHandlers();
            this.checkAuthOnLoad();
            
            this.initialized = true;
            console.log('Junrai Karaoke App initialized successfully');
        });
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    /**
     * Initialize all modules based on current page
     */
    initializeModules() {
        const currentPath = window.location.pathname;
        
        // Core modules (always loaded)
        this.modules.eventBus = window.EventBus;
        this.modules.api = window.API;
        this.modules.dom = window.DOM;
        this.modules.auth = window.Auth;
        
        // Page-specific modules
        if (currentPath.includes('/admin')) {
            this.initializeAdminModules();
        } else if (currentPath.includes('/booking') || currentPath.includes('/rooms')) {
            this.initializeBookingModules();
        } else if (currentPath.includes('/payment')) {
            this.initializePaymentModules();
        } else if (currentPath === '/auth') {
            this.initializeAuthModules();
        }
        
        // Initialize common modules for all pages
        this.initializeCommonModules();
    }

    /**
     * Initialize admin-specific modules
     */
    initializeAdminModules() {
        if (window.AdminDashboard) {
            this.modules.adminDashboard = window.AdminDashboard;
        }
    }

    /**
     * Initialize booking-specific modules
     */
    initializeBookingModules() {
        if (window.Booking) {
            this.modules.booking = window.Booking;
        }
    }

    /**
     * Initialize payment-specific modules
     */
    initializePaymentModules() {
        if (window.Payment) {
            this.modules.payment = window.Payment;
        }
    }

    /**
     * Initialize auth-specific modules
     */
    initializeAuthModules() {
        // Auth module is always initialized
        // Additional auth-specific setup can go here
    }

    /**
     * Initialize modules common to all pages
     */
    initializeCommonModules() {
        // Mobile navigation toggle
        this.setupMobileNavigation();
        
        // CSRF token setup
        this.setupCSRFToken();
        
        // Lazy loading for images
        this.setupLazyLoading();
        
        // Form enhancements
        this.setupFormEnhancements();
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle navigation
        window.EventBus.on('navigate', (event) => {
            const { url, newWindow } = event.data;
            if (newWindow) {
                window.open(url, '_blank');
            } else {
                window.location.href = url;
            }
        });

        // Handle logout from any module
        window.EventBus.on('auth:logout', () => {
            this.handleLogout();
        });

        // Handle auth errors
        window.EventBus.on('auth:error', (event) => {
            this.handleAuthError(event.data);
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handlePageVisibilityChange();
            }
        });

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 250);
        });
    }

    /**
     * Check authentication status on page load
     */
    checkAuthOnLoad() {
        // Auth module handles this automatically
        // Additional checks can be added here if needed
        
        // Auto-redirect if on auth page and already logged in
        if (window.location.pathname === '/auth' && window.Auth.isAuthenticated()) {
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
            const defaultRedirect = window.Auth.isAdmin() ? '/admin' : '/dashboard';
            window.location.href = redirectUrl || defaultRedirect;
        }
    }

    /**
     * Setup mobile navigation
     */
    setupMobileNavigation() {
        const navToggle = window.DOM.$('#navToggle');
        const navbar = window.DOM.$('.navbar');
        
        if (navToggle && navbar) {
            window.DOM.addEventListener(navToggle, 'click', () => {
                window.DOM.toggleClass(navbar, 'mobile-open');
            });

            // Close mobile nav when clicking outside
            document.addEventListener('click', (event) => {
                if (!navbar.contains(event.target)) {
                    window.DOM.removeClass(navbar, 'mobile-open');
                }
            });
        }
    }

    /**
     * Setup CSRF token
     */
    setupCSRFToken() {
        // Extract CSRF token from meta tag or script tag
        const metaToken = window.DOM.$('meta[name="csrf-token"]');
        if (metaToken) {
            window.csrfToken = metaToken.getAttribute('content');
        }
        
        // Also check for inline script variable
        if (typeof csrfToken !== 'undefined') {
            window.csrfToken = csrfToken;
        }
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            window.DOM.$$('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Setup form enhancements
     */
    setupFormEnhancements() {
        // Auto-save form data in localStorage for recovery
        window.DOM.$$('form[data-autosave]').forEach(form => {
            this.setupFormAutoSave(form);
        });

        // Real-time validation
        window.DOM.$$('input[data-validate], textarea[data-validate]').forEach(input => {
            this.setupInputValidation(input);
        });
    }

    /**
     * Setup form auto-save
     */
    setupFormAutoSave(form) {
        const formId = form.id || `form-${Date.now()}`;
        const storageKey = `autosave-${formId}`;
        
        // Load saved data
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input && input.type !== 'password') {
                        input.value = data[key];
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load auto-saved form data:', e);
        }
        
        // Save data on input
        const saveData = window.DOM.debounce(() => {
            try {
                const formData = window.DOM.getFormData(form);
                localStorage.setItem(storageKey, JSON.stringify(formData));
            } catch (e) {
                console.warn('Failed to auto-save form data:', e);
            }
        }, 1000);
        
        form.addEventListener('input', saveData);
        
        // Clear saved data on successful submit
        form.addEventListener('submit', () => {
            localStorage.removeItem(storageKey);
        });
    }

    /**
     * Setup input validation
     */
    setupInputValidation(input) {
        const validateInput = () => {
            const value = input.value;
            const validateType = input.getAttribute('data-validate');
            
            window.EventBus.emit('input:validate', {
                type: validateType,
                input,
                value,
                isValid: this.validateInputValue(value, validateType)
            });
        };
        
        input.addEventListener('blur', validateInput);
        input.addEventListener('input', window.DOM.debounce(validateInput, 500));
    }

    /**
     * Validate input value
     */
    validateInputValue(value, type) {
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'phone':
                return /^[0-9-+().\s]+$/.test(value);
            case 'required':
                return value.trim().length > 0;
            default:
                return true;
        }
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        // Log error details
        console.error('Application error:', error);
        
        // Show user-friendly error message
        const message = this.getUserFriendlyErrorMessage(error);
        window.EventBus.emit('toast:show', {
            message,
            type: 'error',
            duration: 5000
        });
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyErrorMessage(error) {
        if (error.message) {
            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง';
            }
            if (error.message.includes('JSON')) {
                return 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล';
            }
        }
        
        return 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง';
    }

    /**
     * Handle logout
     */
    handleLogout() {
        // Clear any cached data
        this.clearApplicationCache();
        
        // Reset modules if needed
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.reset === 'function') {
                module.reset();
            }
        });
    }

    /**
     * Handle auth error
     */
    handleAuthError(error) {
        if (error.status === 401) {
            this.handleLogout();
        }
    }

    /**
     * Handle page visibility change
     */
    handlePageVisibilityChange() {
        // Refresh auth status when page becomes visible
        if (window.Auth && window.Auth.isAuthenticated()) {
            // Optional: refresh user data or check token validity
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Emit resize event for modules that need to respond
        window.EventBus.emit('window:resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    /**
     * Clear application cache
     */
    clearApplicationCache() {
        // Clear auto-saved form data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('autosave-')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Get application info
     */
    getInfo() {
        return {
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            currentPath: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize the application
window.JunraiApp = new JunraiKaraokeApp();

// Make app info available for debugging
window.debug = {
    app: () => window.JunraiApp.getInfo(),
    modules: () => window.JunraiApp.modules,
    eventBus: () => window.EventBus.debug(),
    auth: () => ({
        isAuthenticated: window.Auth.isAuthenticated(),
        isAdmin: window.Auth.isAdmin(),
        user: window.Auth.getCurrentUser()
    })
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiKaraokeApp;
}