/**
 * ================================================================
 * JUNRAI KARAOKE - ADMIN DASHBOARD MODULE
 * Modern admin interface with real-time updates and CRUD operations
 * ================================================================
 */

class JunraiAdminDashboard {
    constructor() {
        this.currentTab = 'dashboard';
        this.refreshInterval = null;
        this.chartInstances = {};
        this.realTimeData = {
            stats: {},
            bookings: [],
            rooms: [],
            activities: []
        };
        
        this.init();
    }

    /**
     * Initialize admin dashboard
     */
    init() {
        // Check admin authentication
        if (!junraiAuth.requireAdmin()) {
            return;
        }

        this.bindElements();
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeUpdates();
        this.initializeCharts();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Main containers
        this.dashboardContainer = JunraiUtils.findElement('.admin-dashboard');
        this.statsGrid = JunraiUtils.findElement('.stats-grid');
        this.quickActionsGrid = JunraiUtils.findElement('.quick-actions-grid');
        this.dashboardGrid = JunraiUtils.findElement('.dashboard-grid');
        
        // Statistics elements
        this.totalRevenueEl = JunraiUtils.findElement('#totalRevenue');
        this.totalBookingsEl = JunraiUtils.findElement('#totalBookings');
        this.activeRoomsEl = JunraiUtils.findElement('#activeRooms');
        this.activeUsersEl = JunraiUtils.findElement('#activeUsers');
        
        // Change indicators
        this.revenueChangeEl = JunraiUtils.findElement('#revenueChange');
        this.bookingsChangeEl = JunraiUtils.findElement('#bookingsChange');
        this.roomsStatusEl = JunraiUtils.findElement('#roomsStatus');
        this.usersStatusEl = JunraiUtils.findElement('#usersStatus');
        
        // Widget content areas
        this.recentBookingsList = JunraiUtils.findElement('#recentBookingsList');
        this.roomStatusGrid = JunraiUtils.findElement('#roomStatusGrid');
        this.businessHoursStatus = JunraiUtils.findElement('#businessHoursStatus');
        this.businessHoursText = JunraiUtils.findElement('#businessHoursText');
        
        // Chart elements
        this.revenueChart = JunraiUtils.findElement('#revenueChart');
        this.chartLoading = JunraiUtils.findElement('#chartLoading');
        this.chartPeriod = JunraiUtils.findElement('#chartPeriod');
        
        // Action buttons
        this.refreshDashboard = JunraiUtils.findElement('#refreshDashboard');
        this.quickBookingBtn = JunraiUtils.findElement('#quickBooking');
        this.refreshBookings = JunraiUtils.findElement('#refreshBookings');
        this.refreshRooms = JunraiUtils.findElement('#refreshRooms');
        
        // Modal elements
        this.quickBookingModal = JunraiUtils.findElement('#quickBookingModal');
        this.quickBookingForm = JunraiUtils.findElement('#quickBookingForm');
        this.submitQuickBooking = JunraiUtils.findElement('#submitQuickBooking');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Refresh dashboard
        if (this.refreshDashboard) {
            JunraiUtils.on(this.refreshDashboard, 'click', this.refreshAllData.bind(this));
        }

        // Quick booking
        if (this.quickBookingBtn) {
            JunraiUtils.on(this.quickBookingBtn, 'click', this.showQuickBookingModal.bind(this));
        }

        if (this.submitQuickBooking) {
            JunraiUtils.on(this.submitQuickBooking, 'click', this.handleQuickBooking.bind(this));
        }

        // Widget refresh buttons
        if (this.refreshBookings) {
            JunraiUtils.on(this.refreshBookings, 'click', this.loadRecentBookings.bind(this));
        }

        if (this.refreshRooms) {
            JunraiUtils.on(this.refreshRooms, 'click', this.loadRoomStatus.bind(this));
        }

        // Chart period change
        if (this.chartPeriod) {
            JunraiUtils.on(this.chartPeriod, 'change', this.updateRevenueChart.bind(this));
        }

        // Quick action cards
        JunraiUtils.findElements('.quick-action-card').forEach(card => {
            JunraiUtils.on(card, 'click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Global events
        JunraiUtils.on(document, 'junrai:booking:success', this.handleBookingUpdate.bind(this));
        JunraiUtils.on(document, 'junrai:room:updated', this.handleRoomUpdate.bind(this));
        
        // Page visibility changes
        JunraiUtils.on(document, 'visibilitychange', this.handleVisibilityChange.bind(this));
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            JunraiUtils.showLoading?.();
            
            await Promise.all([
                this.loadDashboardStats(),
                this.loadRecentBookings(),
                this.loadRoomStatus(),
                this.updateBusinessHoursStatus(),
                this.loadRevenueChart()
            ]);

        } catch (error) {
            JunraiUtils.logError(error, 'Admin dashboard initialization');
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            JunraiUtils.hideLoading?.();
        }
    }

    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            const response = await JunraiUtils.apiRequest('/api/admin/dashboard/stats');
            
            if (response.success) {
                this.realTimeData.stats = response.data;
                this.updateStatsDisplay();
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Load dashboard stats');
        }
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const stats = this.realTimeData.stats;
        
        // Update revenue
        if (this.totalRevenueEl) {
            this.totalRevenueEl.textContent = JunraiUtils.formatCurrency(stats.totalRevenue || 0);
        }
        
        if (this.revenueChangeEl && stats.revenueChange !== undefined) {
            this.updateChangeIndicator(this.revenueChangeEl, stats.revenueChange);
        }

        // Update bookings
        if (this.totalBookingsEl) {
            this.totalBookingsEl.textContent = stats.totalBookings || 0;
        }
        
        if (this.bookingsChangeEl && stats.bookingsChange !== undefined) {
            this.updateChangeIndicator(this.bookingsChangeEl, stats.bookingsChange);
        }

        // Update rooms
        if (this.activeRoomsEl) {
            this.activeRoomsEl.textContent = `${stats.occupiedRooms || 0}/${stats.totalRooms || 0}`;
        }
        
        if (this.roomsStatusEl) {
            const occupancyRate = stats.totalRooms > 0 ? (stats.occupiedRooms / stats.totalRooms) * 100 : 0;
            this.roomsStatusEl.innerHTML = `
                <i class="fas fa-circle" style="color: ${occupancyRate > 80 ? '#e74c3c' : occupancyRate > 50 ? '#f39c12' : '#2ecc71'}" aria-hidden="true"></i>
                <span>${Math.round(occupancyRate)}% ใช้งาน</span>
            `;
        }

        // Update users
        if (this.activeUsersEl) {
            this.activeUsersEl.textContent = stats.activeUsers || 0;
        }
        
        if (this.usersStatusEl) {
            this.usersStatusEl.innerHTML = `
                <i class="fas fa-circle" style="color: #2ecc71" aria-hidden="true"></i>
                <span>ออนไลน์</span>
            `;
        }
    }

    /**
     * Update change indicator
     */
    updateChangeIndicator(element, change) {
        const isPositive = change >= 0;
        const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        const className = isPositive ? 'positive' : 'negative';
        
        element.className = `stat-change ${className}`;
        element.innerHTML = `
            <i class="fas ${icon}" aria-hidden="true"></i>
            <span>${isPositive ? '+' : ''}${change}%</span>
        `;
    }

    /**
     * Load recent bookings
     */
    async loadRecentBookings() {
        try {
            const response = await JunraiUtils.apiRequest('/api/admin/dashboard/recent-bookings');
            
            if (response.success) {
                this.realTimeData.bookings = response.bookings;
                this.updateRecentBookingsDisplay();
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Load recent bookings');
            this.showBookingsError();
        }
    }

    /**
     * Update recent bookings display
     */
    updateRecentBookingsDisplay() {
        if (!this.recentBookingsList) return;

        const bookings = this.realTimeData.bookings;
        
        if (!bookings || bookings.length === 0) {
            this.recentBookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times" aria-hidden="true"></i>
                    <h4>ไม่มีการจองล่าสุด</h4>
                    <p>ยังไม่มีการจองในช่วงเวลานี้</p>
                </div>
            `;
            return;
        }

        this.recentBookingsList.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-info">
                    <div class="booking-customer">
                        <i class="fas fa-user" aria-hidden="true"></i>
                        <span>${JunraiUtils.sanitizeInput(booking.customer_name)}</span>
                    </div>
                    <div class="booking-room">
                        <i class="fas fa-door-open" aria-hidden="true"></i>
                        <span>${JunraiUtils.sanitizeInput(booking.room_name)}</span>
                    </div>
                    <div class="booking-time">
                        <i class="fas fa-clock" aria-hidden="true"></i>
                        <span>${JunraiUtils.formatDateTime(booking.start_time)}</span>
                    </div>
                </div>
                <div class="booking-status">
                    <span class="status-badge ${booking.status}">${this.getBookingStatusText(booking.status)}</span>
                    <div class="booking-actions">
                        <button class="btn btn-ghost btn-sm" onclick="viewBooking('${booking.id}')" title="ดูรายละเอียด">
                            <i class="fas fa-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load room status
     */
    async loadRoomStatus() {
        try {
            const response = await JunraiUtils.apiRequest('/api/admin/dashboard/room-status');
            
            if (response.success) {
                this.realTimeData.rooms = response.rooms;
                this.updateRoomStatusDisplay();
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Load room status');
            this.showRoomsError();
        }
    }

    /**
     * Update room status display
     */
    updateRoomStatusDisplay() {
        if (!this.roomStatusGrid) return;

        const rooms = this.realTimeData.rooms;
        
        if (!rooms || rooms.length === 0) {
            this.roomStatusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed" aria-hidden="true"></i>
                    <h4>ไม่มีข้อมูลห้อง</h4>
                    <p>ยังไม่มีห้องในระบบ</p>
                </div>
            `;
            return;
        }

        this.roomStatusGrid.innerHTML = rooms.map(room => `
            <div class="room-status-card ${room.status}">
                <div class="room-header">
                    <h4 class="room-name">${JunraiUtils.sanitizeInput(room.name)}</h4>
                    <div class="room-status-indicator ${room.status}"></div>
                </div>
                <div class="room-details">
                    <div class="room-capacity">
                        <i class="fas fa-users" aria-hidden="true"></i>
                        <span>${room.capacity} คน</span>
                    </div>
                    <div class="room-price">
                        <i class="fas fa-money-bill-wave" aria-hidden="true"></i>
                        <span>${JunraiUtils.formatCurrency(room.hourly_rate)}/ชม.</span>
                    </div>
                </div>
                <div class="room-current-booking">
                    ${room.current_booking ? `
                        <div class="current-booking">
                            <i class="fas fa-clock" aria-hidden="true"></i>
                            <span>จนถึง ${JunraiUtils.formatTime(room.current_booking.end_time)}</span>
                        </div>
                    ` : `
                        <div class="available">
                            <i class="fas fa-check" aria-hidden="true"></i>
                            <span>ว่าง</span>
                        </div>
                    `}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update business hours status
     */
    updateBusinessHoursStatus() {
        if (!this.businessHoursStatus || !this.businessHoursText) return;

        const isOpen = JunraiUtils.isBusinessOpen();
        const statusClass = isOpen ? 'online' : 'offline';
        const statusText = isOpen ? 'เปิดทำการ' : 'ปิดทำการ';

        this.businessHoursStatus.className = `status-indicator ${statusClass}`;
        this.businessHoursText.textContent = statusText;
    }

    /**
     * Load and update revenue chart
     */
    async loadRevenueChart() {
        if (!this.revenueChart) return;

        try {
            this.showChartLoading();
            
            const period = this.chartPeriod?.value || '7';
            const response = await JunraiUtils.apiRequest(`/api/admin/dashboard/revenue-chart?period=${period}`);
            
            if (response.success) {
                this.updateChart(response.data);
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Load revenue chart');
            this.showChartError();
        } finally {
            this.hideChartLoading();
        }
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Chart.js initialization will be here when Chart.js is loaded
        // For now, we'll use a placeholder
    }

    /**
     * Update revenue chart
     */
    updateChart(data) {
        // Chart update logic will be implemented when Chart.js is available
        console.log('Revenue chart data:', data);
    }

    /**
     * Show quick booking modal
     */
    async showQuickBookingModal() {
        try {
            // Load rooms for dropdown
            const response = await JunraiUtils.apiRequest('/api/rooms');
            
            if (response.success) {
                const roomSelect = JunraiUtils.findElement('#quickRoom');
                if (roomSelect) {
                    roomSelect.innerHTML = '<option value="">เลือกห้อง</option>' + 
                        response.rooms.map(room => 
                            `<option value="${room.id}">${room.name} - ${JunraiUtils.formatCurrency(room.hourly_rate)}/ชม.</option>`
                        ).join('');
                }
            }

            // Set default date to today
            const dateInput = JunraiUtils.findElement('#quickDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }

            // Show modal (using Bootstrap modal if available)
            if (window.bootstrap && this.quickBookingModal) {
                const modal = new bootstrap.Modal(this.quickBookingModal);
                modal.show();
            }

        } catch (error) {
            JunraiUtils.logError(error, 'Show quick booking modal');
            this.showError('เกิดข้อผิดพลาดในการเปิดฟอร์มจอง');
        }
    }

    /**
     * Handle quick booking submission
     */
    async handleQuickBooking() {
        if (!this.validateQuickBookingForm()) {
            return;
        }

        try {
            const formData = this.getQuickBookingFormData();
            
            JunraiUtils.showLoading?.('กำลังจองห้อง...');
            
            const response = await JunraiUtils.apiRequest('/api/admin/bookings', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                JunraiUtils.showToast?.('จองห้องสำเร็จ!', 'success');
                this.closeQuickBookingModal();
                this.refreshAllData();
            } else {
                throw new Error(response.message || 'การจองล้มเหลว');
            }

        } catch (error) {
            JunraiUtils.logError(error, 'Quick booking submission');
            this.showError(error.message || 'เกิดข้อผิดพลาดในการจอง');
        } finally {
            JunraiUtils.hideLoading?.();
        }
    }

    /**
     * Validate quick booking form
     */
    validateQuickBookingForm() {
        const requiredFields = ['quickRoom', 'quickDate', 'quickStartTime', 'quickDuration', 'quickCustomer', 'quickPhone'];
        
        for (const fieldId of requiredFields) {
            const field = JunraiUtils.findElement(`#${fieldId}`);
            if (!field || !field.value.trim()) {
                this.showError(`กรุณากรอก${this.getFieldLabel(fieldId)}`);
                field?.focus();
                return false;
            }
        }

        // Validate phone number
        const phone = JunraiUtils.findElement('#quickPhone')?.value;
        if (phone && !JunraiUtils.validatePhone(phone)) {
            this.showError('หมายเลขโทรศัพท์ไม่ถูกต้อง');
            return false;
        }

        return true;
    }

    /**
     * Get quick booking form data
     */
    getQuickBookingFormData() {
        return {
            room_id: JunraiUtils.findElement('#quickRoom')?.value,
            booking_date: JunraiUtils.findElement('#quickDate')?.value,
            start_time: JunraiUtils.findElement('#quickStartTime')?.value,
            duration: parseInt(JunraiUtils.findElement('#quickDuration')?.value),
            customer_name: JunraiUtils.findElement('#quickCustomer')?.value.trim(),
            customer_phone: JunraiUtils.findElement('#quickPhone')?.value.trim(),
            special_requests: JunraiUtils.findElement('#quickNotes')?.value.trim(),
            admin_booking: true
        };
    }

    /**
     * Close quick booking modal
     */
    closeQuickBookingModal() {
        if (window.bootstrap && this.quickBookingModal) {
            const modal = bootstrap.Modal.getInstance(this.quickBookingModal);
            modal?.hide();
        }
        
        // Reset form
        if (this.quickBookingForm) {
            this.quickBookingForm.reset();
        }
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(action) {
        const routes = {
            'manage-rooms': '/admin/rooms',
            'manage-bookings': '/admin/bookings',
            'manage-users': '/admin/users',
            'view-reports': '/admin/reports'
        };

        const route = routes[action];
        if (route) {
            window.location.href = route;
        }
    }

    /**
     * Setup real-time updates
     */
    setupRealTimeUpdates() {
        // Update every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.loadDashboardStats();
                this.updateBusinessHoursStatus();
            }
        }, 30000);

        // Update recent data every 2 minutes
        setInterval(() => {
            if (!document.hidden) {
                this.loadRecentBookings();
                this.loadRoomStatus();
            }
        }, 120000);
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (!document.hidden) {
            // Refresh data when page becomes visible
            this.refreshAllData();
        }
    }

    /**
     * Refresh all dashboard data
     */
    async refreshAllData() {
        this.refreshDashboard?.classList.add('loading');
        
        try {
            await this.loadInitialData();
            JunraiUtils.showToast?.('รีเฟรชข้อมูลสำเร็จ', 'success', 2000);
        } catch (error) {
            JunraiUtils.logError(error, 'Refresh dashboard data');
            this.showError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
        } finally {
            this.refreshDashboard?.classList.remove('loading');
        }
    }

    /**
     * Utility methods
     */
    getBookingStatusText(status) {
        const statusTexts = {
            'pending': 'รอยืนยัน',
            'confirmed': 'ยืนยันแล้ว',
            'in_progress': 'กำลังใช้งาน',
            'completed': 'เสร็จสิ้น',
            'cancelled': 'ยกเลิก'
        };
        return statusTexts[status] || status;
    }

    getFieldLabel(fieldId) {
        const labels = {
            'quickRoom': 'ห้อง',
            'quickDate': 'วันที่',
            'quickStartTime': 'เวลาเริ่ม',
            'quickDuration': 'ระยะเวลา',
            'quickCustomer': 'ชื่อลูกค้า',
            'quickPhone': 'เบอร์โทรศัพท์'
        };
        return labels[fieldId] || fieldId;
    }

    showChartLoading() {
        if (this.chartLoading) {
            this.chartLoading.style.display = 'flex';
        }
    }

    hideChartLoading() {
        if (this.chartLoading) {
            this.chartLoading.style.display = 'none';
        }
    }

    showChartError() {
        if (this.revenueChart && this.revenueChart.getContext) {
            const ctx = this.revenueChart.getContext('2d');
            ctx.clearRect(0, 0, this.revenueChart.width, this.revenueChart.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('เกิดข้อผิดพลาดในการโหลดแผนภูมิ', this.revenueChart.width / 2, this.revenueChart.height / 2);
        }
    }

    showBookingsError() {
        if (this.recentBookingsList) {
            this.recentBookingsList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    <p>เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง</p>
                </div>
            `;
        }
    }

    showRoomsError() {
        if (this.roomStatusGrid) {
            this.roomStatusGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    <p>เกิดข้อผิดพลาดในการโหลดสถานะห้อง</p>
                </div>
            `;
        }
    }

    showError(message) {
        JunraiUtils.showToast?.(message, 'error', 4000);
    }

    handleBookingUpdate(event) {
        // Refresh bookings when a new booking is created
        this.loadRecentBookings();
        this.loadDashboardStats();
        this.loadRoomStatus();
    }

    handleRoomUpdate(event) {
        // Refresh room status when rooms are updated
        this.loadRoomStatus();
        this.loadDashboardStats();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Destroy chart instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
    }
}

// Global functions for template usage
window.viewBooking = function(bookingId) {
    window.location.href = `/admin/bookings/${bookingId}`;
};

// Initialize admin dashboard
let junraiAdminDashboard;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        junraiAdminDashboard = new JunraiAdminDashboard();
    });
} else {
    junraiAdminDashboard = new JunraiAdminDashboard();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (junraiAdminDashboard) {
        junraiAdminDashboard.destroy();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiAdminDashboard;
}

// Make available globally
window.JunraiAdminDashboard = JunraiAdminDashboard;
window.junraiAdminDashboard = junraiAdminDashboard;