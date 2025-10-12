/**
 * ==========================================
 * Global Application Configuration
 * ==========================================
 */

window.APP_CONFIG = {
    // API Configuration
    API_BASE: '/api',
    ENDPOINTS: {
        AUTH: '/api/auth',
        BOOKINGS: '/api/bookings',
        ADMIN: '/api/admin',
        ROOMS: '/api/rooms',
        USERS: '/api/users',
        PAYMENTS: '/api/payments',
        ORDERS: '/api/orders'
    },
    
    // Application Settings
    SETTINGS: {
        REQUEST_TIMEOUT: 15000, // 15 seconds
        RETRY_ATTEMPTS: 3,
        PAGINATION_LIMIT: 20,
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
    },
    
    // UI Configuration
    UI: {
        LOADING_DELAY: 300, // Show loading after 300ms
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 500
    },
    
    // Validation Rules
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 8,
        USERNAME_MIN_LENGTH: 3,
        PHONE_PATTERN: /^[0-9]{9,10}$/,
        EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
};

// Global utility functions
window.APP_UTILS = {
    
    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            method: 'GET',
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.SETTINGS.REQUEST_TIMEOUT);
            
            const response = await fetch(endpoint, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    },
    
    /**
     * Show user notification
     */
    showNotification(message, type = 'info') {
        // Simple implementation - can be enhanced with toast library
        const className = type === 'error' ? 'alert-danger' : 
                         type === 'success' ? 'alert-success' : 'alert-info';
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Try to find existing notification area
        let notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'notification-area';
            notificationArea.style.position = 'fixed';
            notificationArea.style.top = '20px';
            notificationArea.style.right = '20px';
            notificationArea.style.zIndex = '9999';
            document.body.appendChild(notificationArea);
        }
        
        const alert = document.createElement('div');
        alert.className = `alert ${className} alert-dismissible`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        notificationArea.appendChild(alert);
        
        // Auto remove after duration
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, APP_CONFIG.UI.TOAST_DURATION);
    },
    
    /**
     * Format currency
     */
    formatCurrency(amount) {
        return `฿${parseFloat(amount || 0).toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}`;
    },
    
    /**
     * Format date
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleDateString('th-TH', { ...defaultOptions, ...options });
    },
    
    /**
     * Debounce function
     */
    debounce(func, delay = APP_CONFIG.UI.DEBOUNCE_DELAY) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    /**
     * Validate form input
     */
    validateInput(input, rules) {
        const errors = [];
        const value = input.value.trim();
        
        if (rules.required && !value) {
            errors.push('จำเป็นต้องกรอกข้อมูลนี้');
        }
        
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`ต้องมีอย่างน้อย ${rules.minLength} ตัวอักษร`);
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push('รูปแบบข้อมูลไม่ถูกต้อง');
        }
        
        return errors;
    }
};

// Initialize app when DOM is ready (run only once)
if (!window.appConfigInitialized) {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.appConfigInitialized) return;
        window.appConfigInitialized = true;
        
        console.log('🚀 App configuration loaded successfully');
        
        // Set up global error handler
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled promise rejection:', event.reason);
            if (typeof showToast === 'function') {
                showToast('เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง', 'error');
            }
        });
        
        // Set up global click handler for auth links
        document.addEventListener('click', function(event) {
            if (event.target.matches('[data-auth-required]') && !localStorage.getItem('token')) {
                event.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('กรุณาเข้าสู่ระบบก่อนดำเนินการ', 'error');
                }
                // Prevent redirect loops
                if (window.location.pathname !== '/auth') {
                    window.location.replace('/auth');
                }
            }
        });
    });
}

console.log('📁 App configuration module loaded');