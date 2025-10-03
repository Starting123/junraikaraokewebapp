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
        showToast('ไม่พบข้อมูลการจอง', 'error');
        setTimeout(() => {
            window.location.href = '/bookings';
        }, 2000);
        return;
    }
    
    // Check authentication
    checkAuth();
    
    // Load booking data
    loadBookingData();
    
    // Initialize payment method handlers
    initPaymentMethods();
    
    // Initialize form submission
    initFormSubmission();
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
    const authLink = document.getElementById('authLink');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (authLink) authLink.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (dashboardLink) dashboardLink.style.display = 'block';
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
        showToast('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
        setTimeout(() => {
            window.location.href = '/bookings';
        }, 2000);
    } finally {
        showLoading(false);
    }
}

// Display booking summary
function displayBookingSummary(booking) {
    const summaryContainer = document.getElementById('bookingSummary');
    
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    
    summaryContainer.innerHTML = `
        <h3><i class="fas fa-receipt"></i> สรุปการจอง</h3>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-door-open"></i>
                ห้อง
            </div>
            <div class="summary-value">${booking.room_name}</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-tag"></i>
                ประเภท
            </div>
            <div class="summary-value">${booking.type_name || 'ห้องธรรมดา'}</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-users"></i>
                ขนาด
            </div>
            <div class="summary-value">${booking.capacity || 4} คน</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-calendar"></i>
                วันที่
            </div>
            <div class="summary-value">${formatDate(startDate)}</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-clock"></i>
                เวลา
            </div>
            <div class="summary-value">${formatTime(startDate)} - ${formatTime(endDate)}</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-hourglass-half"></i>
                ระยะเวลา
            </div>
            <div class="summary-value">${booking.duration_hours || 1} ชั่วโมง</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-money-bill-wave"></i>
                ราคาต่อชั่วโมง
            </div>
            <div class="summary-value">${booking.price_per_hour || 0} บาท</div>
        </div>
        
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-calculator"></i>
                <strong>ยอดรวม</strong>
            </div>
            <div class="summary-value"><strong>${booking.total_price || 0} บาท</strong></div>
        </div>
    `;
}

// Initialize payment methods
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            showPaymentDetails(this.value);
        });
    });
    
    // Show initial payment details
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (selectedMethod) {
        showPaymentDetails(selectedMethod.value);
    }
}

// Show payment details based on selected method
function showPaymentDetails(method) {
    const detailsContainer = document.getElementById('paymentDetails');
    
    let detailsHTML = '';
    
    switch (method) {
        case 'cash':
            detailsHTML = `
                <h4><i class="fas fa-info-circle"></i> การชำระเงินสด</h4>
                <p>กرุณานำเงินสดมาชำระที่หน้าร้านก่อนเข้าใช้งานห้อง</p>
                <div class="alert alert-info">
                    <i class="fas fa-clock"></i>
                    กรุณามาถึงก่อนเวลาจอง 15 นาที เพื่อทำการชำระเงิน
                </div>
            `;
            break;
            
        case 'credit_card':
            detailsHTML = `
                <h4><i class="fas fa-credit-card"></i> การชำระด้วยบัตรเครดิต</h4>
                <p>รองรับบัตรเครดิตทุกประเภท Visa, MasterCard, JCB</p>
                <div class="alert alert-warning">
                    <i class="fas fa-shield-alt"></i>
                    การชำระเงินปลอดภัยด้วยระบบเข้ารหัส SSL
                </div>
            `;
            break;
            
        case 'bank_transfer':
            detailsHTML = `
                <h4><i class="fas fa-university"></i> การโอนเงินผ่านธนาคาร</h4>
                <div class="bank-info">
                    <div class="bank-detail">
                        <strong>ธนาคาร:</strong>
                        <span>ไทยพาณิชย์</span>
                    </div>
                    <div class="bank-detail">
                        <strong>เลขที่บัญชี:</strong>
                        <span>123-4-56789-0</span>
                    </div>
                    <div class="bank-detail">
                        <strong>ชื่อบัญชี:</strong>
                        <span>บริษัท จันทร์ไร คาราโอเกะ จำกัด</span>
                    </div>
                    <div class="bank-detail">
                        <strong>จำนวนเงิน:</strong>
                        <span>${bookingData ? bookingData.total_price : 0} บาท</span>
                    </div>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-camera"></i>
                    กรุณาถ่ายภาพสลิปการโอนเงินและใส่เลขอ้างอิงด้านล่าง
                </div>
            `;
            break;
            
        case 'qr_code':
            detailsHTML = `
                <h4><i class="fas fa-qrcode"></i> การชำระด้วย QR Code</h4>
                <div class="qr-code-container">
                    <div class="qr-code-placeholder">
                        <i class="fas fa-qrcode"></i>
                        <br>QR Code สำหรับชำระเงิน
                    </div>
                    <p>สแกน QR Code ด้วยแอปธนาคารหรือ TrueMoney Wallet</p>
                    <p><strong>จำนวนเงิน: ${bookingData ? bookingData.total_price : 0} บาท</strong></p>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-mobile-alt"></i>
                    หลังชำระเงินแล้ว กรุณาใส่เลขอ้างอิงการชำระเงินด้านล่าง
                </div>
            `;
            break;
    }
    
    detailsContainer.innerHTML = detailsHTML;
    detailsContainer.classList.add('active');
}

// Initialize form submission
function initFormSubmission() {
    const form = document.getElementById('paymentForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await processPayment();
    });
}

// Process payment
async function processPayment() {
    if (!currentBookingId || !bookingData) {
        showToast('ไม่พบข้อมูลการจอง', 'error');
        return;
    }
    
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const transactionId = document.getElementById('transactionId').value;
    
    try {
        showLoading(true);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/bookings/${currentBookingId}/payment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method,
                transaction_id: transactionId || null
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccessModal();
        } else {
            const data = await response.json();
            showToast(data.error || 'เกิดข้อผิดพลาดในการชำระเงิน', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showToast('เกิดข้อผิดพลาดในการชำระเงิน', 'error');
    } finally {
        showLoading(false);
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'block';
}

// Navigation functions
function goBack() {
    window.location.href = '/bookings';
}

function goToDashboard() {
    window.location.href = '/dashboard';
}

function goToBookings() {
    window.location.href = '/bookings';
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(show) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>กำลังดำเนินการ...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-times-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}