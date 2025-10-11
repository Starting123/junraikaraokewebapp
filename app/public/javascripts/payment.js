// ==========================================
// Payment Page JavaScript
// ==========================================

const API_BASE = '/api';
let currentBookingId = null;
let bookingData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get booking ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentBookingId = urlParams.get('booking_id');
    if (!currentBookingId) {
        if (typeof showToast === 'function') {
            showToast('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07', 'error');
        }
        setTimeout(() => {
            window.location.href = '/bookings';
        }, 2000);
        return;
    }

    // Check authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    }

    // Load booking data
    if (typeof loadBookingData === 'function') {
        loadBookingData();
    }

    // Initialize payment method handlers
    if (typeof initPaymentMethods === 'function') {
        initPaymentMethods();
    }

    // Initialize form submission
    if (typeof initFormSubmission === 'function') {
        initFormSubmission();
    }
});

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        updateUserNavigation(data.user);
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    }
}

// Update user navigation
function updateUserNavigation(user) {
    if (!user) return;
    const authLink = document.getElementById('authLink');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardLink = document.getElementById('dashboardLink');
    const adminLink = document.getElementById('adminLink');
    if (authLink) authLink.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (dashboardLink) dashboardLink.style.display = 'block';
    // Show admin link for admin users
    if (user.role_id === 1 && adminLink) {
        adminLink.style.display = 'block';
    }
}

// Load booking data
async function loadBookingData() {
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/bookings/${currentBookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            bookingData = data.booking;
            displayBookingSummary(bookingData);
        } else {
            throw new Error('Failed to load booking data');
        }
    } catch (error) {
        console.error('Load booking error:', error);
    }
}
