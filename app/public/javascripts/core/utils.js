/**
 * ================================================================
 * JUNRAI KARAOKE - CORE UTILITIES MODULE
 * Modern JavaScript utilities and helpers
 * ================================================================
 */

class JunraiUtils {
    /**
     * API Configuration and HTTP Client
     */
    static config = {
        baseURL: '',
        timeout: 10000,
        retries: 3
    };

    /**
     * Enhanced HTTP Client with error handling and retry logic
     */
    static async apiRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: this.config.timeout
        };

        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        const finalOptions = { ...defaultOptions, ...options };
        
        // Merge headers
        if (options.headers) {
            finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
        }

        let lastError;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
                
                const response = await fetch(url, {
                    ...finalOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }

            } catch (error) {
                lastError = error;
                
                if (attempt === this.config.retries || error.name === 'AbortError') {
                    break;
                }
                
                // Exponential backoff
                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }

        throw new Error(`Request failed after ${this.config.retries + 1} attempts: ${lastError.message}`);
    }

    /**
     * Authentication and User Management
     */
    static getAuthToken() {
        return localStorage.getItem('junrai_auth_token');
    }

    static setAuthToken(token) {
        localStorage.setItem('junrai_auth_token', token);
    }

    static getCurrentUser() {
        try {
            const userData = localStorage.getItem('junrai_user_data');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    static setCurrentUser(userData) {
        localStorage.setItem('junrai_user_data', JSON.stringify(userData));
    }

    static isAuthenticated() {
        return !!(this.getAuthToken() && this.getCurrentUser());
    }

    static isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role_id === 1;
    }

    static logout() {
        localStorage.removeItem('junrai_auth_token');
        localStorage.removeItem('junrai_user_data');
        localStorage.removeItem('junrai_session_data');
        
        // Clear any cached data
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.startsWith('junrai-')) {
                        caches.delete(name);
                    }
                });
            });
        }
        
        window.location.href = '/auth';
    }

    /**
     * Date and Time Utilities
     */
    static formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const finalOptions = { ...defaultOptions, ...options };
        return new Intl.DateTimeFormat('th-TH', finalOptions).format(new Date(date));
    }

    static formatTime(date, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        const finalOptions = { ...defaultOptions, ...options };
        return new Intl.DateTimeFormat('th-TH', finalOptions).format(new Date(date));
    }

    static formatCurrency(amount, currency = 'THB') {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    static getBusinessHours() {
        return {
            open: 18, // 6 PM
            close: 2,  // 2 AM (next day)
            closedDays: [1] // Monday (0 = Sunday, 1 = Monday, etc.)
        };
    }

    static isBusinessOpen(date = new Date()) {
        const hours = this.getBusinessHours();
        const day = date.getDay();
        const hour = date.getHours();

        // Check if closed day
        if (hours.closedDays.includes(day)) {
            return false;
        }

        // Check business hours (handles overnight hours)
        if (hours.close > hours.open) {
            // Same day operation
            return hour >= hours.open && hour < hours.close;
        } else {
            // Overnight operation (close next day)
            return hour >= hours.open || hour < hours.close;
        }
    }

    /**
     * Form Validation Utilities
     */
    static validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static validatePhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 9 && cleaned.length <= 15;
    }

    static validateRequired(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * DOM Utilities
     */
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, attributes[key]);
            } else {
                element[key] = attributes[key];
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    }

    static findElement(selector, context = document) {
        return context.querySelector(selector);
    }

    static findElements(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    static addClass(element, className) {
        if (element) element.classList.add(className);
    }

    static removeClass(element, className) {
        if (element) element.classList.remove(className);
    }

    static toggleClass(element, className) {
        if (element) return element.classList.toggle(className);
        return false;
    }

    static hasClass(element, className) {
        return element && element.classList.contains(className);
    }

    /**
     * Event Management
     */
    static on(element, event, handler, options = {}) {
        if (element) {
            element.addEventListener(event, handler, options);
        }
    }

    static off(element, event, handler, options = {}) {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    }

    static once(element, event, handler, options = {}) {
        if (element) {
            element.addEventListener(event, handler, { ...options, once: true });
        }
    }

    static emit(element, eventName, data = {}) {
        if (element) {
            const event = new CustomEvent(eventName, { detail: data });
            element.dispatchEvent(event);
        }
    }

    /**
     * Local Storage with Error Handling
     */
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error setting localStorage:', error);
            return false;
        }
    }

    static getLocalStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Error getting localStorage:', error);
            return defaultValue;
        }
    }

    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing localStorage:', error);
            return false;
        }
    }

    /**
     * Utility Functions
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateId(prefix = 'junrai') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }

    /**
     * Performance Monitoring
     */
    static measurePerformance(name, func) {
        return async function(...args) {
            const start = performance.now();
            try {
                const result = await func.apply(this, args);
                const end = performance.now();
                console.log(`${name} completed in ${end - start} milliseconds`);
                return result;
            } catch (error) {
                const end = performance.now();
                console.error(`${name} failed after ${end - start} milliseconds:`, error);
                throw error;
            }
        };
    }

    /**
     * Error Handling and Logging
     */
    static logError(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        console.error('Junrai Error:', errorInfo);
        
        // Send to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
            // this.sendErrorToService(errorInfo);
        }
    }

    static handleAsyncError(promise, context = '') {
        return promise.catch(error => {
            this.logError(error, context);
            throw error;
        });
    }

    /**
     * Cache Management
     */
    static cache = new Map();

    static setCache(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default
        const item = {
            value: value,
            expiry: Date.now() + ttl
        };
        this.cache.set(key, item);
    }

    static getCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    static clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiUtils;
}

// Make available globally
window.JunraiUtils = JunraiUtils;