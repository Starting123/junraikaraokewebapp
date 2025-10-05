// ==========================================
// SHARED AUTHENTICATION & NAVIGATION SCRIPT
// ==========================================

// Global user variable
let currentUser = null;

// Universal authentication checker
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            currentUser = JSON.parse(user);
            
            // Update navigation for authenticated users
            const authLink = document.getElementById('authLink');
            const logoutBtn = document.getElementById('logoutBtn');
            const bookingsLink = document.getElementById('bookingsLink');
            const adminLink = document.getElementById('adminLink');
            const heroBookingBtn = document.getElementById('heroBookingBtn');
            const dashboardLink = document.getElementById('dashboardLink');
            
            // Hide login link, show logout button
            if (authLink) authLink.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            
            // Show bookings link for all logged-in users
            if (bookingsLink) bookingsLink.style.display = 'block';
            
            // Show dashboard link for all logged-in users (if exists)
            if (dashboardLink) dashboardLink.style.display = 'block';
            
            // Show hero booking button (if on homepage)
            if (heroBookingBtn) heroBookingBtn.style.display = 'inline-flex';
            
            // Show admin features for administrators (role_id = 1)
            if (currentUser.role_id === 1) {
                // Show admin dashboard link
                if (adminLink) adminLink.style.display = 'block';
                
                // Show admin controls on specific pages
                const addRoomBtn = document.getElementById('addRoomBtn');
                if (addRoomBtn) addRoomBtn.style.display = 'block';
                
                // Show admin hero card (if on homepage)
                const adminHeroCard = document.getElementById('adminHeroCard');
                if (adminHeroCard) adminHeroCard.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error parsing user data:', error);
            // Clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
}

// Universal logout function
function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }
}

// Store hours check (reusable)
function checkStoreHours() {
    const storeStatus = document.getElementById('storeStatus');
    const statusText = document.getElementById('statusText');
    
    if (!storeStatus || !statusText) return;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    
    // Store is closed on Mondays (day 1)
    // Open Tuesday-Sunday (days 2,3,4,5,6,0) from 11:00 to 21:00
    const isMonday = currentDay === 1;
    const isWithinHours = currentHour >= 11 && currentHour < 21;
    const isOpenDay = !isMonday;
    
    if (isOpenDay && isWithinHours) {
        storeStatus.className = 'store-status open';
        statusText.textContent = 'เปิดอยู่';
        statusText.style.color = '#4CAF50';
    } else if (isOpenDay && !isWithinHours) {
        storeStatus.className = 'store-status closed';
        statusText.textContent = 'ปิดแล้ว';
        statusText.style.color = '#f44336';
    } else {
        storeStatus.className = 'store-status closed';
        statusText.textContent = 'ปิด (วันจันทร์)';
        statusText.style.color = '#f44336';
    }
}

// Initialize authentication check when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    checkStoreHours();
});

// Check authentication periodically (every 5 minutes)
setInterval(checkAuth, 5 * 60 * 1000);

// Update store status every minute
setInterval(checkStoreHours, 60 * 1000);