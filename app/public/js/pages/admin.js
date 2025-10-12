/**
 * Admin Dashboard Page Module
 * Page-specific functionality for /admin
 */

import { $, $$, on } from "../core/dom.js";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/api.js";
import { showToast, emit } from "../core/events.js";

/**
 * Initialize admin dashboard page
 * Called when admin page loads
 */
export function initAdminDashboard() {
    console.log('Initializing admin dashboard...');
    
    setupTabNavigation();
    loadOverviewData();
    setupRefreshHandler();
    
    // Load initial tab content
    const activeTab = $('.admin-tab.active')?.dataset?.tab || 'overview';
    loadTabContent(activeTab);
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
    const tabs = $$('.admin-tab');
    
    tabs.forEach(tab => {
        on(tab, 'click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
}

/**
 * Switch between admin tabs
 * @param {string} tabName - Tab to switch to
 */
function switchTab(tabName) {
    // Update tab buttons
    $$('.admin-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    $$('.tab-content').forEach(content => {
        if (content.id === `${tabName}-content`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load tab-specific content
    loadTabContent(tabName);
}

/**
 * Load content for specific tab
 * @param {string} tabName - Tab name to load
 */
async function loadTabContent(tabName) {
    switch (tabName) {
        case 'overview':
            await loadOverviewData();
            break;
        case 'bookings':
            await loadBookingsData();
            break;
        case 'rooms':
            await loadRoomsData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'payments':
            await loadPaymentsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

/**
 * Load overview dashboard data
 */
async function loadOverviewData() {
    try {
        // Load stats
        const statsResponse = await apiGet('/admin/stats');
        updateStatsCards(statsResponse.stats);
        
        // Load recent activities
        const activitiesResponse = await apiGet('/admin/activities?limit=10');
        updateRecentActivities(activitiesResponse.activities);
        
        // Load chart data
        await loadDashboardCharts();
        
    } catch (error) {
        console.error('Failed to load overview data:', error);
        showToast('ไม่สามารถโหลดข้อมูลภาพรวมได้', 'error');
    }
}

/**
 * Update stats cards with data
 * @param {Object} stats - Stats data from API
 */
function updateStatsCards(stats) {
    const updates = [
        { id: 'total-bookings-admin', value: stats.totalBookings || 0, change: stats.bookingsChange || 0 },
        { id: 'total-users-admin', value: stats.totalUsers || 0, change: stats.usersChange || 0 },
        { id: 'total-revenue-admin', value: formatCurrency(stats.totalRevenue || 0), change: stats.revenueChange || 0 },
        { id: 'total-rooms-admin', value: stats.totalRooms || 0, change: 0 }
    ];
    
    updates.forEach(({ id, value, change }) => {
        const element = $(`#${id}`);
        if (element) {
            element.textContent = value;
        }
        
        const changeElement = $(`#${id.replace('total-', '').replace('-admin', '')}-change`);
        if (changeElement && change !== 0) {
            changeElement.textContent = `${change > 0 ? '+' : ''}${change}%`;
            changeElement.className = `stat-change ${change > 0 ? 'positive' : 'negative'}`;
        }
    });
}

/**
 * Update recent activities list
 * @param {Array} activities - Activities data from API
 */
function updateRecentActivities(activities) {
    const container = $('#recent-activities');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <div class="empty-icon">
                    <i class="fas fa-history"></i>
                </div>
                <p>ไม่มีกิจกรรมล่าสุด</p>
            </div>
        `;
        return;
    }
    
    const activitiesHtml = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${formatDateTime(activity.created_at)}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = activitiesHtml;
}

/**
 * Load bookings management data
 */
async function loadBookingsData() {
    const container = $('#bookings-table-content');
    const loading = $('#bookings-table-loading');
    
    if (!container || !loading) return;
    
    try {
        loading.style.display = 'block';
        container.style.display = 'none';
        
        const response = await apiGet('/admin/bookings');
        const bookings = response.bookings || [];
        
        const tableHtml = createBookingsTable(bookings);
        container.innerHTML = tableHtml;
        
        loading.style.display = 'none';
        container.style.display = 'block';
        
        // Setup table actions
        setupBookingsTableActions();
        
    } catch (error) {
        console.error('Failed to load bookings data:', error);
        loading.style.display = 'none';
        showToast('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
    }
}

/**
 * Load rooms management data
 */
async function loadRoomsData() {
    const container = $('#admin-rooms-grid');
    
    if (!container) return;
    
    try {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>กำลังโหลดข้อมูลห้อง...</p>
            </div>
        `;
        
        const response = await apiGet('/admin/rooms');
        const rooms = response.rooms || [];
        
        const roomsHtml = rooms.map(room => createRoomCard(room)).join('');
        container.innerHTML = roomsHtml;
        
        // Setup room actions
        setupRoomActions();
        
    } catch (error) {
        console.error('Failed to load rooms data:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>เกิดข้อผิดพลาด</h3>
                <p>ไม่สามารถโหลดข้อมูลห้องได้</p>
            </div>
        `;
    }
}

/**
 * Load users management data
 */
async function loadUsersData() {
    const container = $('#users-table-content');
    const loading = $('#users-table-loading');
    
    if (!container || !loading) return;
    
    try {
        loading.style.display = 'block';
        container.style.display = 'none';
        
        const response = await apiGet('/admin/users');
        const users = response.users || [];
        
        const tableHtml = createUsersTable(users);
        container.innerHTML = tableHtml;
        
        loading.style.display = 'none';
        container.style.display = 'block';
        
        // Setup table actions
        setupUsersTableActions();
        
    } catch (error) {
        console.error('Failed to load users data:', error);
        loading.style.display = 'none';
        showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
    }
}

/**
 * Load payments management data
 */
async function loadPaymentsData() {
    const container = $('#payments-table-content');
    const loading = $('#payments-table-loading');
    
    if (!container || !loading) return;
    
    try {
        loading.style.display = 'block';
        container.style.display = 'none';
        
        const response = await apiGet('/admin/payments');
        const payments = response.payments || [];
        
        const tableHtml = createPaymentsTable(payments);
        container.innerHTML = tableHtml;
        
        loading.style.display = 'none';
        container.style.display = 'block';
        
        // Setup table actions
        setupPaymentsTableActions();
        
    } catch (error) {
        console.error('Failed to load payments data:', error);
        loading.style.display = 'none';
        showToast('ไม่สามารถโหลดข้อมูลการชำระเงินได้', 'error');
    }
}

/**
 * Load settings data
 */
function loadSettingsData() {
    // Settings are mostly static, just setup event handlers
    setupSettingsHandlers();
}

/**
 * Setup refresh handler
 */
function setupRefreshHandler() {
    const refreshBtn = $('#refresh-dashboard');
    
    if (refreshBtn) {
        on(refreshBtn, 'click', async () => {
            const activeTab = $('.admin-tab.active')?.dataset?.tab || 'overview';
            
            // Add loading state to button
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> รีเฟรช...';
            refreshBtn.disabled = true;
            
            await loadTabContent(activeTab);
            
            // Reset button
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> รีเฟรชข้อมูล';
            refreshBtn.disabled = false;
            
            showToast('รีเฟรชข้อมูลสำเร็จ', 'success');
        });
    }
}

/**
 * Create bookings table HTML
 * @param {Array} bookings - Bookings data
 * @returns {string} Table HTML
 */
function createBookingsTable(bookings) {
    if (bookings.length === 0) {
        return '<div class="empty-state"><p>ไม่มีข้อมูลการจอง</p></div>';
    }
    
    const rows = bookings.map(booking => `
        <tr data-booking-id="${booking.booking_id}">
            <td>${booking.booking_id}</td>
            <td>${booking.user_name}</td>
            <td>${booking.room_name}</td>
            <td>${formatDate(booking.booking_date)}</td>
            <td>${booking.start_time} - ${booking.end_time}</td>
            <td><span class="status-badge ${getStatusClass(booking.status)}">${getStatusText(booking.status)}</span></td>
            <td>${formatCurrency(booking.total_price)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-small btn-outline btn-view" data-booking-id="${booking.booking_id}">ดู</button>
                    ${booking.status === 'pending' ? `<button class="btn btn-small btn-primary btn-confirm" data-booking-id="${booking.booking_id}">ยืนยัน</button>` : ''}
                    ${booking.status !== 'cancelled' ? `<button class="btn btn-small btn-danger btn-cancel" data-booking-id="${booking.booking_id}">ยกเลิก</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    return `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>ผู้ใช้</th>
                    <th>ห้อง</th>
                    <th>วันที่</th>
                    <th>เวลา</th>
                    <th>สถานะ</th>
                    <th>ราคา</th>
                    <th>การจัดการ</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Create room card HTML
 * @param {Object} room - Room data
 * @returns {string} Room card HTML
 */
function createRoomCard(room) {
    return `
        <div class="admin-room-card" data-room-id="${room.room_id}">
            <div class="room-card-header">
                <h3>${room.name}</h3>
                <span class="room-status ${room.status}">${room.status === 'available' ? 'ว่าง' : 'ไม่ว่าง'}</span>
            </div>
            <div class="room-card-content">
                <div class="room-info">
                    <p><strong>ประเภท:</strong> ${room.type_name}</p>
                    <p><strong>ความจุ:</strong> ${room.capacity} คน</p>
                    <p><strong>ราคา:</strong> ${formatCurrency(room.price_per_hour)}/ชั่วโมง</p>
                </div>
                <div class="room-actions">
                    <button class="btn btn-small btn-outline btn-edit-room" data-room-id="${room.room_id}">แก้ไข</button>
                    <button class="btn btn-small btn-primary btn-toggle-room" data-room-id="${room.room_id}">${room.status === 'available' ? 'ปิด' : 'เปิด'}</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Utility functions
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('th-TH');
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-unknown';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'รอการยืนยัน',
        'confirmed': 'ยืนยันแล้ว',
        'completed': 'เสร็จสิ้น',
        'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || 'ไม่ทราบสถานะ';
}

function getActivityIcon(type) {
    const iconMap = {
        'booking': 'fas fa-calendar-plus',
        'user': 'fas fa-user-plus',
        'payment': 'fas fa-credit-card',
        'room': 'fas fa-door-open',
        'system': 'fas fa-cog'
    };
    return iconMap[type] || 'fas fa-info-circle';
}

/**
 * Setup table actions
 */
function setupBookingsTableActions() {
    const container = $('#bookings-table-content');
    if (!container) return;
    
    on(container, 'click', async (e) => {
        const target = e.target;
        const bookingId = target.dataset.bookingId;
        
        if (target.classList.contains('btn-confirm') && bookingId) {
            await confirmBooking(bookingId);
        }
        
        if (target.classList.contains('btn-cancel') && bookingId) {
            await cancelBooking(bookingId);
        }
        
        if (target.classList.contains('btn-view') && bookingId) {
            viewBookingDetails(bookingId);
        }
    });
}

function setupRoomActions() {
    const container = $('#admin-rooms-grid');
    if (!container) return;
    
    on(container, 'click', async (e) => {
        const target = e.target;
        const roomId = target.dataset.roomId;
        
        if (target.classList.contains('btn-edit-room') && roomId) {
            editRoom(roomId);
        }
        
        if (target.classList.contains('btn-toggle-room') && roomId) {
            await toggleRoomStatus(roomId);
        }
    });
}

/**
 * Admin actions
 */
async function confirmBooking(bookingId) {
    try {
        await apiPost(`/admin/bookings/${bookingId}/confirm`);
        showToast('ยืนยันการจองสำเร็จ', 'success');
        loadBookingsData(); // Reload data
    } catch (error) {
        console.error('Failed to confirm booking:', error);
        showToast('ไม่สามารถยืนยันการจองได้', 'error');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) {
        return;
    }
    
    try {
        await apiDelete(`/admin/bookings/${bookingId}`);
        showToast('ยกเลิกการจองสำเร็จ', 'success');
        loadBookingsData(); // Reload data
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        showToast('ไม่สามารถยกเลิกการจองได้', 'error');
    }
}

async function toggleRoomStatus(roomId) {
    try {
        await apiPost(`/admin/rooms/${roomId}/toggle-status`);
        showToast('เปลี่ยนสถานะห้องสำเร็จ', 'success');
        loadRoomsData(); // Reload data
    } catch (error) {
        console.error('Failed to toggle room status:', error);
        showToast('ไม่สามารถเปลี่ยนสถานะห้องได้', 'error');
    }
}

function viewBookingDetails(bookingId) {
    // Implement booking details modal or redirect
    console.log('View booking details:', bookingId);
}

function editRoom(roomId) {
    // Implement room editing modal or redirect
    console.log('Edit room:', roomId);
}

/**
 * Placeholder functions for other features
 */
function createUsersTable(users) {
    return '<div class="empty-state"><p>ตารางผู้ใช้ (จะพัฒนาต่อ)</p></div>';
}

function createPaymentsTable(payments) {
    return '<div class="empty-state"><p>ตารางการชำระเงิน (จะพัฒนาต่อ)</p></div>';
}

function setupUsersTableActions() {
    // To be implemented
}

function setupPaymentsTableActions() {
    // To be implemented
}

function setupSettingsHandlers() {
    // To be implemented
}

async function loadDashboardCharts() {
    // Placeholder for chart implementation
    const bookingsChart = $('#bookings-chart');
    const roomUsageChart = $('#room-usage-chart');
    
    if (bookingsChart) {
        bookingsChart.innerHTML = '<p>กราฟการจองรายเดือน (จะพัฒนาต่อ)</p>';
    }
    
    if (roomUsageChart) {
        roomUsageChart.innerHTML = '<p>กราฟอัตราการใช้งานห้อง (จะพัฒนาต่อ)</p>';
    }
}

// Auto-initialize if we're on the admin page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.serverData?.currentPage === 'admin') {
            initAdminDashboard();
        }
    });
} else if (window.serverData?.currentPage === 'admin') {
    initAdminDashboard();
}