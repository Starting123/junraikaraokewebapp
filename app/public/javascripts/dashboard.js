// ==========================================
// Dashboard Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Check authentication and load user data
    if (typeof checkAuth === 'function') {
        checkAuth();
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && typeof logout === 'function') {
        logoutBtn.addEventListener('click', logout);
    }

    // Load user statistics
    if (typeof loadUserStats === 'function') {
        loadUserStats();
    }
});

// Check authentication and load user info
async function checkAuth() {
    // Prevent infinite redirect loops
    if (window.location.pathname === '/auth') {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No auth token found, redirecting to auth page');
        window.location.href = '/auth';
        return;
    }
    
    // Check if we're already checking auth to prevent multiple simultaneous calls
    if (window.checkingAuth) {
        return;
    }
    
    window.checkingAuth = true;
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUserInfo(data.user);
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on auth page
        if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
        }
    } finally {
        window.checkingAuth = false;
    }
}

// Update user information in the UI
function updateUserInfo(user) {
    if (!user) return;
    const userName = document.getElementById('userName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const adminLink = document.getElementById('adminLink');
    if (userName) {
        userName.textContent = user.name || '';
    }
    if (welcomeMessage) {
        welcomeMessage.textContent = `\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35 ${user.name || ''}! \u0e22\u0e34\u0e19\u0e14\u0e35\u0e15\u0e49\u0e2d\u0e19\u0e23\u0e31\u0e1a\u0e01\u0e25\u0e31\u0e1a\u0e21\u0e32`;
    }
    // Show admin link for admin users
    if (user.role_id === 1 && adminLink) {
        adminLink.style.display = 'block';
    }
}

// Logout function
function logout() {
    if (confirm('\u0e04\u0e38\u0e13\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?')) {
        // ...existing code...
    }
}
