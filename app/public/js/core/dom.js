/**
 * DOM Utilities Module
 * Safe DOM manipulation helpers with null checks and error handling
 */

class DOMUtils {
    /**
     * Safely query a single element
     */
    static $(selector, context = document) {
        try {
            return context.querySelector(selector);
        } catch (e) {
            console.warn(`Invalid selector: ${selector}`, e);
            return null;
        }
    }

    /**
     * Safely query multiple elements
     */
    static $$(selector, context = document) {
        try {
            return Array.from(context.querySelectorAll(selector));
        } catch (e) {
            console.warn(`Invalid selector: ${selector}`, e);
            return [];
        }
    }

    /**
     * Safely get element by ID
     */
    static getElementById(id) {
        try {
            return document.getElementById(id);
        } catch (e) {
            console.warn(`Error getting element by ID: ${id}`, e);
            return null;
        }
    }

    /**
     * Safely add event listener with cleanup tracking
     */
    static addEventListener(element, event, handler, options = {}) {
        if (!element || typeof handler !== 'function') {
            console.warn('Invalid element or handler for addEventListener');
            return null;
        }

        try {
            element.addEventListener(event, handler, options);
            
            // Return cleanup function
            return () => {
                element.removeEventListener(event, handler, options);
            };
        } catch (e) {
            console.warn('Error adding event listener:', e);
            return null;
        }
    }

    /**
     * Safely set element content
     */
    static setContent(element, content, isHTML = false) {
        if (!element) return false;

        try {
            if (isHTML) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
            return true;
        } catch (e) {
            console.warn('Error setting content:', e);
            return false;
        }
    }

    /**
     * Safely get form data as object
     */
    static getFormData(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            console.warn('Invalid form element');
            return {};
        }

        try {
            const formData = new FormData(form);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
                // Handle multiple values (checkboxes, etc.)
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
            
            return data;
        } catch (e) {
            console.warn('Error getting form data:', e);
            return {};
        }
    }

    /**
     * Safely toggle class
     */
    static toggleClass(element, className, force = undefined) {
        if (!element || !className) return false;

        try {
            return element.classList.toggle(className, force);
        } catch (e) {
            console.warn('Error toggling class:', e);
            return false;
        }
    }

    /**
     * Safely add class
     */
    static addClass(element, className) {
        if (!element || !className) return false;

        try {
            element.classList.add(className);
            return true;
        } catch (e) {
            console.warn('Error adding class:', e);
            return false;
        }
    }

    /**
     * Safely remove class
     */
    static removeClass(element, className) {
        if (!element || !className) return false;

        try {
            element.classList.remove(className);
            return true;
        } catch (e) {
            console.warn('Error removing class:', e);
            return false;
        }
    }

    /**
     * Safely check if element has class
     */
    static hasClass(element, className) {
        if (!element || !className) return false;

        try {
            return element.classList.contains(className);
        } catch (e) {
            console.warn('Error checking class:', e);
            return false;
        }
    }

    /**
     * Safely show/hide elements
     */
    static show(element, display = 'block') {
        if (!element) return false;
        
        try {
            element.style.display = display;
            return true;
        } catch (e) {
            console.warn('Error showing element:', e);
            return false;
        }
    }

    static hide(element) {
        if (!element) return false;
        
        try {
            element.style.display = 'none';
            return true;
        } catch (e) {
            console.warn('Error hiding element:', e);
            return false;
        }
    }

    /**
     * Safely set/get attributes
     */
    static setAttribute(element, name, value) {
        if (!element || !name) return false;

        try {
            element.setAttribute(name, value);
            return true;
        } catch (e) {
            console.warn('Error setting attribute:', e);
            return false;
        }
    }

    static getAttribute(element, name) {
        if (!element || !name) return null;

        try {
            return element.getAttribute(name);
        } catch (e) {
            console.warn('Error getting attribute:', e);
            return null;
        }
    }

    /**
     * Create element safely
     */
    static createElement(tagName, attributes = {}, content = '') {
        try {
            const element = document.createElement(tagName);
            
            // Set attributes
            Object.keys(attributes).forEach(key => {
                element.setAttribute(key, attributes[key]);
            });
            
            // Set content
            if (content) {
                element.textContent = content;
            }
            
            return element;
        } catch (e) {
            console.warn('Error creating element:', e);
            return null;
        }
    }

    /**
     * Safely append child
     */
    static appendChild(parent, child) {
        if (!parent || !child) return false;

        try {
            parent.appendChild(child);
            return true;
        } catch (e) {
            console.warn('Error appending child:', e);
            return false;
        }
    }

    /**
     * Safely remove element
     */
    static removeElement(element) {
        if (!element) return false;

        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            return true;
        } catch (e) {
            console.warn('Error removing element:', e);
            return false;
        }
    }

    /**
     * Safely get element position
     */
    static getPosition(element) {
        if (!element) return { top: 0, left: 0, width: 0, height: 0 };

        try {
            return element.getBoundingClientRect();
        } catch (e) {
            console.warn('Error getting position:', e);
            return { top: 0, left: 0, width: 0, height: 0 };
        }
    }

    /**
     * Safely scroll to element
     */
    static scrollTo(element, options = { behavior: 'smooth', block: 'start' }) {
        if (!element) return false;

        try {
            element.scrollIntoView(options);
            return true;
        } catch (e) {
            console.warn('Error scrolling to element:', e);
            return false;
        }
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
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

    /**
     * Wait for DOM to be ready
     */
    static ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    /**
     * Generate unique ID
     */
    static generateId(prefix = 'el') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Export ES6 module functions
 */
export const $ = DOMUtils.$;
export const $$ = DOMUtils.$$;
export const on = DOMUtils.addEventListener;
export const off = DOMUtils.removeEventListener;
export const ready = DOMUtils.ready;
export const createElement = DOMUtils.createElement;
export const addClass = DOMUtils.addClass;
export const removeClass = DOMUtils.removeClass;
export const toggleClass = DOMUtils.toggleClass;
export const hasClass = DOMUtils.hasClass;
export const setAttributes = DOMUtils.setAttributes;
export const getFormData = DOMUtils.getFormData;
export const clearForm = DOMUtils.clearForm;
export const show = DOMUtils.show;
export const hide = DOMUtils.hide;
export const toggle = DOMUtils.toggle;

// Global alias for convenience
window.DOM = DOMUtils;
window.$ = DOMUtils.$;
window.$$ = DOMUtils.$$;