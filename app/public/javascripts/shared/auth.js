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
    // Prevent redirect loops
    if (window.location.pathname === '/auth') {
        return false;
    }
    
    if (!isAuthenticated()) {
        console.log('🔒 requireAuth: Redirecting to auth');
        window.location.replace('/auth');
        return false;
    }
    return true;
}

/**
 * Redirect to auth page if not admin
 */
function requireAdmin() {
    // Prevent redirect loops
    if (window.location.pathname === '/auth' || window.location.pathname === '/dashboard') {
        return false;
    }
    
    if (!isAdmin()) {
        if (!isAuthenticated()) {
            console.log('🔒 requireAdmin: No auth, redirecting to auth');
            window.location.replace('/auth');
        } else {
            console.log('🔒 requireAdmin: Not admin, redirecting to dashboard');
            window.location.replace('/dashboard');
        }
        return false;
    }
    return true;
}

/**
 * Initialize navbar based on authentication status
 */
function initializeNavbar() {
    const user = getCurrentUser();
    const userFromStorage = localStorage.getItem('user');
    
    // Try to get user from localStorage if token doesn't have complete data
    let currentUser = user;
    if (userFromStorage) {
        try {
            currentUser = JSON.parse(userFromStorage);
        } catch (e) {
            console.warn('Failed to parse user from localStorage');
        }
    }
    
    if (isAuthenticated() && currentUser) {
        // Show authenticated elements
        setElementDisplay('authLink', false);
        setElementDisplay('logoutBtn', true);
        
        // Show dashboard and admin links ONLY for admin users (role_id === 1)
        if (currentUser.role_id === 1) {
            setElementDisplay('dashboardLink', true);
            setElementDisplay('adminLink', true);
            console.log('🔑 Admin navbar privileges granted - both dashboard and admin links shown');
        } else {
            setElementDisplay('dashboardLink', false);
            setElementDisplay('adminLink', false);
            console.log('👥 Customer user - dashboard and admin links hidden from navbar');
        }
    } else {
        // Hide protected elements for unauthenticated users
        setElementDisplay('adminLink', false);
        setElementDisplay('dashboardLink', false);
        setElementDisplay('logoutBtn', false);
        setElementDisplay('authLink', true);
        console.log('🔒 Unauthenticated - admin link hidden from navbar');
    }
}

/**
 * Set element display safely
 */
function setElementDisplay(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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