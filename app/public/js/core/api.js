/**
 * API Core Module
 * Generic fetch wrapper with authentication, error handling, and CSRF support
 */

class ApiCore {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.token = this.getToken();
    }

    /**
     * Get authentication token from localStorage
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    /**
     * Get CSRF token from page or meta tag
     */
    getCsrfToken() {
        // Check window global first
        if (window.csrfToken) {
            return window.csrfToken;
        }
        
        // Check meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            return meta.getAttribute('content');
        }
        
        return null;
    }

    /**
     * Get default headers for requests
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        // Add auth token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Add CSRF token for non-GET requests
        const csrfToken = this.getCsrfToken();
        if (csrfToken && customHeaders['X-HTTP-Method-Override'] !== 'GET') {
            headers['CSRF-Token'] = csrfToken;
        }

        return headers;
    }

    /**
     * Handle response and errors
     */
    async handleResponse(response) {
        // Handle 401 - token expired or invalid
        if (response.status === 401) {
            this.setToken(null);
            localStorage.removeItem('user');
            
            // Emit auth error event
            window.EventBus?.emit('auth:error', { status: 401, message: 'Authentication required' });
            
            // Redirect to auth page if not already there
            if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
            }
            
            throw new Error('Authentication required');
        }

        // Handle other HTTP errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        return response.json();
    }

    /**
     * Generic GET request
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getHeaders(),
            credentials: 'same-origin'
        });

        return this.handleResponse(response);
    }

    /**
     * Generic POST request
     */
    async post(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    }

    /**
     * Generic PUT request
     */
    async put(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    }

    /**
     * Generic DELETE request
     */
    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            credentials: 'same-origin'
        });

        return this.handleResponse(response);
    }

    /**
     * Upload file with FormData
     */
    async upload(endpoint, formData) {
        const headers = {};
        
        // Add auth token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Add CSRF token
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
            headers['CSRF-Token'] = csrfToken;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: formData
        });

        return this.handleResponse(response);
    }

    /**
     * Web-specific logout (calls web routes, not API)
     */
    async logout() {
        try {
            // Try POST /logout (web route) with CSRF token
            const csrfToken = this.getCsrfToken();
            await fetch('/logout', {
                method: 'POST',
                credentials: 'same-origin',
                headers: csrfToken ? { 'CSRF-Token': csrfToken } : {}
            });
        } catch (e) {
            // Ignore server errors during logout
        }

        try {
            // Try API logout as fallback
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch (e) {
            // Ignore server errors during logout
        }

        // Always clear client-side data
        this.setToken(null);
        localStorage.removeItem('user');
        
        // Emit logout event
        window.EventBus?.emit('auth:logout');
        
        // Redirect to homepage
        window.location.href = '/';
    }
}

// Create API instance
const api = new ApiCore();

/**
 * Export ES6 module functions
 */
export const apiGet = api.get.bind(api);
export const apiPost = api.post.bind(api);
export const apiPut = api.put.bind(api);
export const apiDelete = api.delete.bind(api);
export const apiUpload = api.upload.bind(api);
export const setToken = api.setToken.bind(api);
export const getToken = api.getToken.bind(api);

// Create global API instance for legacy compatibility
window.API = api;