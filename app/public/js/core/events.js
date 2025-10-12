/**
 * Event Bus Module
 * Pub/Sub system for decoupled component communication
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.maxListeners = 50; // Prevent memory leaks
    }

    /**
     * Subscribe to an event
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            console.warn('EventBus: Callback must be a function');
            return null;
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        
        // Check max listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`EventBus: Maximum listeners (${this.maxListeners}) reached for event: ${eventName}`);
            return null;
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateId()
        };

        listeners.push(listener);
        
        // Sort by priority (higher first)
        listeners.sort((a, b) => b.priority - a.priority);

        // Return unsubscribe function
        return () => this.off(eventName, listener.id);
    }

    /**
     * Subscribe to an event (one-time only)
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     */
    off(eventName, callbackOrId) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        let index = -1;

        if (typeof callbackOrId === 'function') {
            // Find by callback function
            index = listeners.findIndex(listener => listener.callback === callbackOrId);
        } else if (typeof callbackOrId === 'string') {
            // Find by listener ID
            index = listeners.findIndex(listener => listener.id === callbackOrId);
        }

        if (index > -1) {
            listeners.splice(index, 1);
            
            // Clean up empty event arrays
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Emit an event
     */
    emit(eventName, data = null) {
        if (!this.events.has(eventName)) {
            return 0;
        }

        const listeners = this.events.get(eventName);
        const listenersToRemove = [];
        let called = 0;

        // Create event object
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            defaultPrevented: false,
            preventDefault: () => { event.defaultPrevented = true; }
        };

        // Call listeners
        for (const listener of listeners) {
            try {
                listener.callback(event);
                called++;

                // Mark for removal if it's a one-time listener
                if (listener.once) {
                    listenersToRemove.push(listener.id);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for event "${eventName}":`, error);
            }
        }

        // Remove one-time listeners
        listenersToRemove.forEach(id => this.off(eventName, id));

        return called;
    }

    /**
     * Remove all listeners for an event or all events
     */
    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get listener count for an event
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Get all event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Generate unique listener ID
     */
    generateId() {
        return `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debug info
     */
    debug() {
        const info = {};
        for (const [eventName, listeners] of this.events) {
            info[eventName] = {
                count: listeners.length,
                listeners: listeners.map(l => ({
                    once: l.once,
                    priority: l.priority,
                    id: l.id
                }))
            };
        }
        return info;
    }
}

/**
 * Specialized UI Event Handlers
 */
class UIEvents {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // Global click handler for buttons with data attributes
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (target) {
                const action = target.getAttribute('data-action');
                const data = this.getDataAttributes(target);
                
                this.eventBus.emit('ui:action', {
                    action,
                    element: target,
                    data,
                    originalEvent: e
                });
            }
        });

        // Global form submit handler
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.hasAttribute('data-module')) {
                const module = form.getAttribute('data-module');
                const action = form.getAttribute('data-action') || 'submit';
                
                this.eventBus.emit('form:submit', {
                    module,
                    action,
                    form,
                    originalEvent: e
                });
            }
        });

        // Global input change handler for real-time validation
        document.addEventListener('input', (e) => {
            const input = e.target;
            if (input.hasAttribute('data-validate')) {
                const validateType = input.getAttribute('data-validate');
                
                this.eventBus.emit('input:validate', {
                    type: validateType,
                    input,
                    value: input.value,
                    originalEvent: e
                });
            }
        });
    }

    /**
     * Extract all data-* attributes from element
     */
    getDataAttributes(element) {
        const data = {};
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
                const key = attr.name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                data[key] = attr.value;
            }
        }
        return data;
    }
}

/**
 * Toast Notification System
 */
class ToastSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.init();
    }

    init() {
        // Listen for toast events
        this.eventBus.on('toast:show', (event) => {
            this.show(event.data);
        });

        // Create container if it doesn't exist
        this.createContainer();
    }

    createContainer() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(options = {}) {
        const {
            message = '',
            type = 'info',
            duration = 4000,
            closable = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            ${icon ? `<i class="${icon}"></i>` : ''}
            <span class="toast-message">${message}</span>
            ${closable ? '<button class="toast-close" type="button">&times;</button>' : ''}
        `;

        // Add close handler
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.remove(toast));
        }

        // Add to container
        this.container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        // Emit shown event
        this.eventBus.emit('toast:shown', { toast, options });

        return toast;
    }

    remove(toast) {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || '';
    }
}

// Create instances
const eventBus = new EventBus();
const uiEvents = new UIEvents(eventBus);
const toastSystem = new ToastSystem(eventBus);

/**
 * Export ES6 module functions and classes
 */
export { EventBus, UIEvents, ToastSystem };
export const eventBusInstance = eventBus;
export const emit = eventBus.emit.bind(eventBus);
export const on = eventBus.on.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const showToast = toastSystem.show.bind(toastSystem);

// Create global instances for legacy compatibility
window.EventBus = eventBus;
window.UIEvents = uiEvents;
window.ToastSystem = toastSystem;