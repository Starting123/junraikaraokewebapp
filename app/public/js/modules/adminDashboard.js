/**
 * Admin Dashboard Module
 * Handles admin dashboard functionality, stats, user management, room management
 */

class AdminDashboardModule {
    constructor() {
        this.stats = {};
        this.users = [];
        this.bookings = [];
        this.rooms = [];
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // Check admin access
        if (!window.Auth.requireAdmin()) {
            return;
        }
        
        this.setupEventListeners();
        this.loadInitialData();
        
        this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submissions
        window.EventBus.on('form:submit', (event) => {
            const { module, action, form, originalEvent } = event.data;
            
            if (module === 'admin') {
                originalEvent.preventDefault();
                
                switch (action) {
                    case 'create-room':
                        this.handleCreateRoom(form);
                        break;
                    case 'update-room':
                        this.handleUpdateRoom(form);
                        break;
                    case 'update-user':
                        this.handleUpdateUser(form);
                        break;
                }
            }
        });

        // UI actions
        window.EventBus.on('ui:action', (event) => {
            const { action, element, data } = event.data;
            
            switch (action) {
                case 'load-stats':
                    this.loadStats();
                    break;
                case 'load-users':
                    this.loadUsers();
                    break;
                case 'load-bookings':
                    this.loadAdminBookings();
                    break;
                case 'load-rooms':
                    this.loadAdminRooms();
                    break;
                case 'edit-room':
                    this.editRoom(data.roomId);
                    break;
                case 'delete-room':
                    this.deleteRoom(data.roomId);
                    break;
                case 'edit-user':
                    this.editUser(data.userId);
                    break;
                case 'toggle-user-status':
                    this.toggleUserStatus(data.userId);
                    break;
                case 'view-booking-details':
                    this.viewBookingDetails(data.bookingId);
                    break;
                case 'update-booking-status':
                    this.updateBookingStatus(data.bookingId, data.status);
                    break;
                case 'export-data':
                    this.exportData(data.type);
                    break;
                case 'refresh-dashboard':
                    this.refreshDashboard();
                    break;
            }
        });

        // Auto-refresh stats every 5 minutes
        setInterval(() => {
            this.loadStats();
        }, 5 * 60 * 1000);
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentActivity()
            ]);
        } catch (error) {
            console.error('Error loading initial admin data:', error);
        }
    }

    /**
     * Load admin statistics
     */
    async loadStats() {
        try {
            const response = await window.API.get('/admin/stats');
            this.stats = response;
            
            this.renderStats();
            window.EventBus.emit('admin:stats-loaded', { stats: this.stats });
            
        } catch (error) {
            console.error('Error loading admin stats:', error);
            this.showError('ไม่สามารถโหลดสstatisticsได้');
        }
    }

    /**
     * Load users for management
     */
    async loadUsers() {
        try {
            const response = await window.API.get('/admin/users');
            this.users = response.users || response;
            
            this.renderUsersTable();
            window.EventBus.emit('admin:users-loaded', { users: this.users });
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
        }
    }

    /**
     * Load bookings for admin management
     */
    async loadAdminBookings() {
        try {
            const response = await window.API.get('/admin/bookings');
            this.bookings = response.bookings || response;
            
            this.renderBookingsTable();
            window.EventBus.emit('admin:bookings-loaded', { bookings: this.bookings });
            
        } catch (error) {
            console.error('Error loading admin bookings:', error);
            this.showError('ไม่สามารถโหลดข้อมูลการจองได้');
        }
    }

    /**
     * Load rooms for admin management
     */
    async loadAdminRooms() {
        try {
            const response = await window.API.get('/admin/rooms');
            this.rooms = response.rooms || response;
            
            this.renderRoomsTable();
            window.EventBus.emit('admin:rooms-loaded', { rooms: this.rooms });
            
        } catch (error) {
            console.error('Error loading admin rooms:', error);
            this.showError('ไม่สามารถโหลดข้อมูลห้องได้');
        }
    }

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        try {
            const response = await window.API.get('/admin/recent-activity');
            this.renderRecentActivity(response.activities || []);
            
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    /**
     * Render statistics dashboard
     */
    renderStats() {
        // Update stat counters
        this.updateStatCounter('totalUsers', this.stats.total_users);
        this.updateStatCounter('newUsersToday', this.stats.new_users_today);
        this.updateStatCounter('totalRooms', this.stats.total_rooms);
        this.updateStatCounter('availableRooms', this.stats.available_rooms);
        this.updateStatCounter('todayBookings', this.stats.today_bookings);
        this.updateStatCounter('todayRevenue', `฿${this.stats.today_revenue || 0}`);
        
        // Update charts if available
        this.updateCharts();
    }

    /**
     * Update individual stat counter
     */
    updateStatCounter(elementId, value) {
        const element = window.DOM.$(`#${elementId}`);
        if (element) {
            // Animate counter if it's a number
            if (typeof value === 'number') {
                this.animateCounter(element, value);
            } else {
                element.textContent = value;
            }
        }
    }

    /**
     * Animate counter with counting effect
     */
    animateCounter(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    /**
     * Render users management table
     */
    renderUsersTable() {
        const container = window.DOM.$('#usersTableContainer');
        if (!container || this.users.length === 0) return;

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ชื่อ</th>
                            <th>อีเมล</th>
                            <th>บทบาท</th>
                            <th>สถานะ</th>
                            <th>วันที่สมัคร</th>
                            <th>การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users.map(user => this.renderUserRow(user)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    /**
     * Render individual user row
     */
    renderUserRow(user) {
        const roleText = this.getUserRoleText(user.role_id);
        const statusClass = user.status === 'active' ? 'success' : 'danger';
        const statusText = user.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน';
        const date = new Date(user.created_at).toLocaleDateString('th-TH');

        return `
            <tr>
                <td>${user.user_id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${roleText}</td>
                <td>
                    <span class="badge badge-${statusClass}">${statusText}</span>
                </td>
                <td>${date}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                data-action="edit-user" 
                                data-user-id="${user.user_id}"
                                title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-${user.status === 'active' ? 'danger' : 'success'}" 
                                data-action="toggle-user-status" 
                                data-user-id="${user.user_id}"
                                title="${user.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render rooms management table
     */
    renderRoomsTable() {
        const container = window.DOM.$('#roomsTableContainer');
        if (!container || this.rooms.length === 0) return;

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ชื่อห้อง</th>
                            <th>ประเภท</th>
                            <th>ความจุ</th>
                            <th>ราคา/ชม.</th>
                            <th>สถานะ</th>
                            <th>การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.rooms.map(room => this.renderRoomRow(room)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    /**
     * Render individual room row
     */
    renderRoomRow(room) {
        const statusClass = room.status === 'available' ? 'success' : 
                          room.status === 'occupied' ? 'warning' : 'danger';
        const statusText = this.getRoomStatusText(room.status);

        return `
            <tr>
                <td>${room.room_id}</td>
                <td>${room.name}</td>
                <td>${room.type_name || 'ไม่ระบุ'}</td>
                <td>${room.capacity || 'ไม่ระบุ'}</td>
                <td>฿${room.price_per_hour || 'ไม่ระบุ'}</td>
                <td>
                    <span class="badge badge-${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                data-action="edit-room" 
                                data-room-id="${room.room_id}"
                                title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" 
                                data-action="delete-room" 
                                data-room-id="${room.room_id}"
                                title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Handle room creation
     */
    async handleCreateRoom(form) {
        const formData = window.DOM.getFormData(form);
        
        if (!this.validateRoomForm(formData)) {
            return;
        }

        try {
            const response = await window.API.post('/admin/rooms', formData);
            
            this.showSuccess('สร้างห้องใหม่สำเร็จ');
            this.loadAdminRooms();
            
            // Reset form
            form.reset();
            
        } catch (error) {
            console.error('Room creation error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
        }
    }

    /**
     * Handle room update
     */
    async handleUpdateRoom(form) {
        const formData = window.DOM.getFormData(form);
        const roomId = formData.room_id;
        
        if (!roomId) {
            this.showError('ไม่พบ ID ห้อง');
            return;
        }

        try {
            const response = await window.API.put(`/admin/rooms/${roomId}`, formData);
            
            this.showSuccess('อัปเดตข้อมูลห้องสำเร็จ');
            this.loadAdminRooms();
            
        } catch (error) {
            console.error('Room update error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการอัปเดตห้อง');
        }
    }

    /**
     * Delete room
     */
    async deleteRoom(roomId) {
        if (!confirm('คุณต้องการลบห้องนี้หรือไม่?')) {
            return;
        }

        try {
            await window.API.delete(`/admin/rooms/${roomId}`);
            
            this.showSuccess('ลบห้องสำเร็จ');
            this.loadAdminRooms();
            
        } catch (error) {
            console.error('Room deletion error:', error);
            this.showError(error.message || 'ไม่สามารถลบห้องได้');
        }
    }

    /**
     * Toggle user status
     */
    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.user_id == userId);
        if (!user) return;

        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน';

        if (!confirm(`คุณต้องการ${action}ผู้ใช้นี้หรือไม่?`)) {
            return;
        }

        try {
            await window.API.put(`/admin/users/${userId}`, { status: newStatus });
            
            this.showSuccess(`${action}ผู้ใช้สำเร็จ`);
            this.loadUsers();
            
        } catch (error) {
            console.error('User status toggle error:', error);
            this.showError(error.message || `ไม่สามารถ${action}ผู้ใช้ได้`);
        }
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(bookingId, status) {
        try {
            await window.API.put(`/admin/bookings/${bookingId}`, { status });
            
            this.showSuccess('อัปเดตสถานะการจองสำเร็จ');
            this.loadAdminBookings();
            
        } catch (error) {
            console.error('Booking status update error:', error);
            this.showError(error.message || 'ไม่สามารถอัปเดตสถานะได้');
        }
    }

    /**
     * Export data
     */
    async exportData(type) {
        try {
            const link = document.createElement('a');
            link.href = `/api/admin/export/${type}`;
            link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
            link.target = '_blank';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showError('ไม่สามารถส่งออกข้อมูลได้');
        }
    }

    /**
     * Refresh entire dashboard
     */
    async refreshDashboard() {
        this.showLoading(true);
        
        try {
            await this.loadInitialData();
            this.showSuccess('รีเฟรชข้อมูลสำเร็จ');
        } catch (error) {
            this.showError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate room form
     */
    validateRoomForm(formData) {
        const errors = [];
        
        if (!formData.name) {
            errors.push('กรุณากรอกชื่อห้อง');
        }
        
        if (!formData.type_id) {
            errors.push('กรุณาเลือกประเภทห้อง');
        }
        
        if (errors.length > 0) {
            this.showError(errors.join('<br>'));
            return false;
        }
        
        return true;
    }

    /**
     * Get user role text
     */
    getUserRoleText(roleId) {
        const roles = {
            1: 'ผู้ดูแลระบบ',
            2: 'พนักงาน',
            3: 'ลูกค้า'
        };
        return roles[roleId] || 'ไม่ทราบ';
    }

    /**
     * Get room status text
     */
    getRoomStatusText(status) {
        const statuses = {
            available: 'ว่าง',
            occupied: 'ไม่ว่าง',
            maintenance: 'ปรับปรุง'
        };
        return statuses[status] || status;
    }

    /**
     * Update charts (if chart library is available)
     */
    updateCharts() {
        // This would integrate with Chart.js or similar
        // Implementation depends on chart library choice
    }

    /**
     * Render recent activity
     */
    renderRecentActivity(activities) {
        const container = window.DOM.$('#recentActivityContainer');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<p class="text-muted">ไม่มีกิจกรรมล่าสุด</p>';
            return;
        }

        const activitiesHTML = activities
            .map(activity => `
                <div class="activity-item">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                    <div class="activity-content">
                        <p>${activity.description}</p>
                        <small class="text-muted">${new Date(activity.created_at).toLocaleString('th-TH')}</small>
                    </div>
                </div>
            `)
            .join('');

        container.innerHTML = activitiesHTML;
    }

    /**
     * Get activity icon
     */
    getActivityIcon(type) {
        const icons = {
            login: 'fa-sign-in-alt',
            booking: 'fa-calendar-plus',
            payment: 'fa-credit-card',
            user: 'fa-user',
            room: 'fa-door-open'
        };
        return icons[type] || 'fa-info-circle';
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const overlay = window.DOM.$('#loadingOverlay');
        if (overlay) {
            window.DOM[show ? 'show' : 'hide'](overlay, 'flex');
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        window.EventBus.emit('toast:show', { message, type: 'success' });
    }

    /**
     * Show error message
     */
    showError(message) {
        window.EventBus.emit('toast:show', { message, type: 'error' });
    }
}

// Create global instance
window.AdminDashboard = new AdminDashboardModule();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboardModule;
}