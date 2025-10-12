/**
 * Admin Module
 * Handles admin dashboard functionality, stats, user management, room management
 */

class AdminModule {
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
        if (!this.checkAdminAccess()) {
            return;
        }
        
        this.setupEventListeners();
        this.loadInitialData();
        
        this.initialized = true;
    }

    checkAdminAccess() {
        const user = window.serverData?.user;
        if (!user || user.role_id !== 1) {
            window.location.href = '/auth';
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Data table actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-edit') || e.target.closest('.btn-edit')) {
                const id = e.target.dataset.id || e.target.closest('.btn-edit').dataset.id;
                const type = e.target.dataset.type || e.target.closest('.btn-edit').dataset.type;
                this.handleEdit(type, id);
            }
            
            if (e.target.matches('.btn-delete') || e.target.closest('.btn-delete')) {
                const id = e.target.dataset.id || e.target.closest('.btn-delete').dataset.id;
                const type = e.target.dataset.type || e.target.closest('.btn-delete').dataset.type;
                this.handleDelete(type, id);
            }
            
            if (e.target.matches('.btn-view') || e.target.closest('.btn-view')) {
                const id = e.target.dataset.id || e.target.closest('.btn-view').dataset.id;
                const type = e.target.dataset.type || e.target.closest('.btn-view').dataset.type;
                this.handleView(type, id);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('data-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Add new buttons
        const addButtons = document.querySelectorAll('.btn-add');
        addButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.handleAdd(type);
            });
        });

        // Refresh data button
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadInitialData();
            });
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadUsers(),
                this.loadBookings(),
                this.loadRooms()
            ]);
        } catch (error) {
            console.error('Failed to load admin data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                this.users = await response.json();
                this.updateUsersTable();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async loadBookings() {
        try {
            const response = await fetch('/api/admin/bookings', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                this.bookings = await response.json();
                this.updateBookingsTable();
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/api/admin/rooms', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                this.rooms = await response.json();
                this.updateRoomsTable();
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    }

    updateStatsDisplay() {
        const statCards = document.querySelectorAll('.admin-card');
        statCards.forEach(card => {
            const statType = card.dataset.stat;
            const valueElement = card.querySelector('.card-value');
            if (valueElement && this.stats[statType] !== undefined) {
                this.animateNumber(valueElement, this.stats[statType]);
            }
        });
    }

    updateUsersTable() {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;

        if (this.users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบข้อมูลผู้ใช้</td></tr>';
            return;
        }

        const usersHTML = this.users.map(user => this.getUserRowHTML(user)).join('');
        tableBody.innerHTML = usersHTML;
    }

    updateBookingsTable() {
        const tableBody = document.querySelector('#bookings-table tbody');
        if (!tableBody) return;

        if (this.bookings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูลการจอง</td></tr>';
            return;
        }

        const bookingsHTML = this.bookings.map(booking => this.getBookingRowHTML(booking)).join('');
        tableBody.innerHTML = bookingsHTML;
    }

    updateRoomsTable() {
        const tableBody = document.querySelector('#rooms-table tbody');
        if (!tableBody) return;

        if (this.rooms.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบข้อมูลห้อง</td></tr>';
            return;
        }

        const roomsHTML = this.rooms.map(room => this.getRoomRowHTML(room)).join('');
        tableBody.innerHTML = roomsHTML;
    }

    getUserRowHTML(user) {
        const roleText = user.role_id === 1 ? 'แอดมิน' : 'ผู้ใช้';
        const statusClass = user.is_active ? 'text-success' : 'text-danger';
        const statusText = user.is_active ? 'ใช้งาน' : 'ระงับ';

        return `
            <tr>
                <td>${user.user_id}</td>
                <td>${user.firstname} ${user.lastname}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${roleText}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-type="user" data-id="${user.user_id}" title="ดูรายละเอียด">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" data-type="user" data-id="${user.user_id}" title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-type="user" data-id="${user.user_id}" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getBookingRowHTML(booking) {
        const statusClass = `status-${booking.status}`;
        const statusText = {
            'confirmed': 'ยืนยันแล้ว',
            'pending': 'รอยืนยัน',
            'cancelled': 'ยกเลิกแล้ว',
            'completed': 'เสร็จสิ้น'
        }[booking.status] || booking.status;

        return `
            <tr>
                <td>#${booking.booking_id}</td>
                <td>${booking.customer_name || 'N/A'}</td>
                <td>${booking.room_name || 'N/A'}</td>
                <td>${new Date(booking.booking_date).toLocaleDateString('th-TH')}</td>
                <td>${booking.start_time} - ${booking.end_time}</td>
                <td><span class="booking-status ${statusClass}">${statusText}</span></td>
                <td>฿${parseFloat(booking.total_amount || 0).toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-type="booking" data-id="${booking.booking_id}" title="ดูรายละเอียด">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" data-type="booking" data-id="${booking.booking_id}" title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-type="booking" data-id="${booking.booking_id}" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getRoomRowHTML(room) {
        const statusClass = `status-${room.status}`;
        const statusText = {
            'available': 'ใช้งานได้',
            'occupied': 'ไม่ว่าง',
            'maintenance': 'ปรับปรุง'
        }[room.status] || room.status;

        return `
            <tr>
                <td>${room.room_id}</td>
                <td>${room.name}</td>
                <td>${room.type_name || 'N/A'}</td>
                <td>${room.capacity || 0} คน</td>
                <td>฿${parseFloat(room.price_per_hour || 0).toFixed(2)}</td>
                <td><span class="room-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-type="room" data-id="${room.room_id}" title="ดูรายละเอียด">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" data-type="room" data-id="${room.room_id}" title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-type="room" data-id="${room.room_id}" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    handleEdit(type, id) {
        // Implementation for edit functionality
        console.log(`Edit ${type} with ID: ${id}`);
    }

    handleDelete(type, id) {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ${this.getTypeText(type)}นี้?`)) {
            return;
        }
        
        // Implementation for delete functionality
        console.log(`Delete ${type} with ID: ${id}`);
    }

    handleView(type, id) {
        // Implementation for view functionality
        console.log(`View ${type} with ID: ${id}`);
    }

    handleAdd(type) {
        // Implementation for add functionality
        console.log(`Add new ${type}`);
    }

    handleSearch(query) {
        // Implementation for search functionality
        console.log(`Search: ${query}`);
    }

    getTypeText(type) {
        const typeTexts = {
            'user': 'ผู้ใช้',
            'booking': 'การจอง',
            'room': 'ห้อง'
        };
        return typeTexts[type] || type;
    }

    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - startValue) / 30);
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = currentValue;
        }, 50);
    }

    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
}

// Initialize when DOM is ready
let adminModule;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminModule = new AdminModule();
    });
} else {
    adminModule = new AdminModule();
}

// Export for global access
window.AdminModule = AdminModule;