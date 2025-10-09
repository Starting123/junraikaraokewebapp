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
    checkAuth();
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Load user statistics
    loadUserStats();
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
    const userName = document.getElementById('userName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const adminLink = document.getElementById('adminLink');
    
    if (userName) {
        userName.textContent = user.name;
    }
    
    if (welcomeMessage) {
        welcomeMessage.textContent = `สวัสดี ${user.name}! ยินดีต้อนรับกลับมา`;
    }
    
    // Show admin link for admin users
    if (user.role_id === 1 && adminLink) {
        adminLink.style.display = 'block';
    }
}

// Logout function
function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Load user bookings
async function loadUserBookings() {
    const bookingsSection = document.getElementById('bookingsSection');
    const bookingsContainer = document.getElementById('bookingsContainer');
    const bookingsLoading = document.getElementById('bookingsLoading');
    
    // Show bookings section
    bookingsSection.style.display = 'block';
    bookingsContainer.innerHTML = '';
    bookingsContainer.appendChild(bookingsLoading);
    
    // Scroll to bookings section
    bookingsSection.scrollIntoView({ behavior: 'smooth' });
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/bookings/my-bookings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            displayBookings(bookings);
        } else {
            throw new Error('Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('ไม่สามารถโหลดข้อมูลการจองได้');
    }
}

// Display bookings
function displayBookings(bookings) {
    const bookingsContainer = document.getElementById('bookingsContainer');
    bookingsContainer.innerHTML = '';
    
    if (bookings.length === 0) {
        bookingsContainer.innerHTML = `
            <div class="empty-bookings">
                <i class="fas fa-calendar-times"></i>
                <h3>ยังไม่มีการจอง</h3>
                <p>คุณยังไม่มีการจองห้องคาราโอเกะ</p>
                <a href="/bookings" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    จองห้องใหม่
                </a>
            </div>
        `;
        return;
    }
    
    bookings.forEach(booking => {
        const bookingCard = createBookingCard(booking);
        bookingsContainer.appendChild(bookingCard);
    });
}

// Create booking card element
function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = `booking-card ${booking.status.toLowerCase()}`;
    
    const statusText = getStatusText(booking.status);
    const statusIcon = getStatusIcon(booking.status);
    
    card.innerHTML = `
        <div class="booking-header">
            <h4>การจอง #${booking.booking_id}</h4>
            <div class="booking-status ${booking.status.toLowerCase()}">
                <i class="fas ${statusIcon}"></i>
                <span>${statusText}</span>
            </div>
        </div>
        <div class="booking-body">
            <div class="booking-info">
                <div class="info-row">
                    <i class="fas fa-door-open"></i>
                    <span>${booking.room_name}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDate(booking.booking_date)}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-clock"></i>
                    <span>${booking.start_time} - ${booking.end_time}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-users"></i>
                    <span>${booking.guest_count} คน</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>฿${booking.total_price?.toLocaleString() || 'N/A'}</span>
                </div>
            </div>
            <div class="booking-actions">
                ${booking.status === 'confirmed' ? `
                    <button class="btn btn-danger btn-small" onclick="cancelBooking(${booking.booking_id})">
                        <i class="fas fa-times"></i>
                        ยกเลิก
                    </button>
                ` : ''}
                <button class="btn btn-outline btn-small" onclick="viewBookingDetails(${booking.booking_id})">
                    <i class="fas fa-eye"></i>
                    ดูรายละเอียด
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Get status text in Thai
function getStatusText(status) {
    const statusMap = {
        'confirmed': 'ยืนยันแล้ว',
        'pending': 'รอยืนยัน',
        'cancelled': 'ยกเลิกแล้ว',
        'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
}

// Get status icon
function getStatusIcon(status) {
    const iconMap = {
        'confirmed': 'fa-check-circle',
        'pending': 'fa-clock',
        'cancelled': 'fa-times-circle',
        'completed': 'fa-flag-checkered'
    };
    return iconMap[status] || 'fa-question-circle';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('คุณต้องการยกเลิกการจองนี้หรือไม่?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('ยกเลิกการจองเรียบร้อยแล้ว', 'success');
            loadUserBookings(); // Reload bookings
            loadUserStats(); // Reload stats
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showNotification('ไม่สามารถยกเลิกการจองได้', 'error');
    }
}

// View booking details
function viewBookingDetails(bookingId) {
    // This could open a modal or redirect to a details page
    window.location.href = `/bookings/${bookingId}`;
}

// Load user statistics
async function loadUserStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/bookings/my-stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStats(stats);
        } else {
            // If endpoint doesn't exist, show default values
            updateStats({
                totalBookings: 0,
                totalHours: 0,
                favoriteRoom: 'ยังไม่มีข้อมูล',
                thisMonth: 0
            });
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Show default values on error
        updateStats({
            totalBookings: 0,
            totalHours: 0,
            favoriteRoom: 'ยังไม่มีข้อมูล',
            thisMonth: 0
        });
    }
}

// Update statistics display
function updateStats(stats) {
    const totalBookings = document.getElementById('totalBookings');
    const totalHours = document.getElementById('totalHours');
    const favoriteRoom = document.getElementById('favoriteRoom');
    const thisMonth = document.getElementById('thisMonth');
    
    if (totalBookings) {
        totalBookings.textContent = stats.totalBookings || '0';
    }
    
    if (totalHours) {
        totalHours.textContent = `${stats.totalHours || 0} ชม.`;
    }
    
    if (favoriteRoom) {
        favoriteRoom.textContent = stats.favoriteRoom || 'ยังไม่มีข้อมูล';
    }
    
    if (thisMonth) {
        thisMonth.textContent = `${stats.thisMonth || 0} ครั้ง`;
    }
}

// Show error message
function showError(message) {
    const bookingsContainer = document.getElementById('bookingsContainer');
    bookingsContainer.innerHTML = `
        <div class="empty-bookings">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>เกิดข้อผิดพลาด</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadUserBookings()">
                <i class="fas fa-redo"></i>
                ลองใหม่
            </button>
        </div>
    `;
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button type="button" class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        padding: 16px;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        margin-left: auto;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Auto close
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
}

function closeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };
    return colors[type] || colors.info;
}