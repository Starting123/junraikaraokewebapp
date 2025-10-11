// ==========================================
// Authentication Utilities
// ==========================================

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        return payload.exp > now;
    } catch (e) {
        localStorage.removeItem('token');
        return false;
    }
}

/**
 * Get current user data from token
 * @returns {object|null} User data or null
 */
function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        if (payload.exp <= now) {
            localStorage.removeItem('token');
            return null;
        }
        return payload;
    } catch (e) {
        localStorage.removeItem('token');
        return null;
    }
}

/**
 * Check if current user is admin
 * @returns {boolean} Admin status
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role_id === 1;
}

/**
 * Redirect to auth page if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/auth';
        return false;
    }
    return true;
}

/**
 * Redirect to auth page if not admin
 */
function requireAdmin() {
    if (!isAdmin()) {
        if (!isAuthenticated()) {
            window.location.href = '/auth';
        } else {
            window.location.href = '/dashboard';
        }
        return false;
    }
    return true;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

/**
 * Get authorization headers for API calls
 * @returns {object} Headers object
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
        throw new Error('Unauthorized');
    }
    
    return response;
}