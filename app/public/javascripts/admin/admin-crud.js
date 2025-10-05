// ==========================================
// ADMIN CRUD OPERATIONS - MODULAR SYSTEM
// ==========================================

class AdminCRUD {
    constructor() {
        this.apiBase = '/api/admin';
        this.token = localStorage.getItem('token');
    }

    // === UTILITY METHODS ===
    async apiCall(endpoint, options = {}) {
        const config = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const response = await fetch(`${this.apiBase}${endpoint}`, config);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }

        return response.json();
    }

    showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);
        
        // Show animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto hide
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    // === USERS CRUD ===
    async loadUsers() {
        try {
            const data = await this.apiCall('/users');
            this.displayUsersTable(data.users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
        }
    }

    displayUsersTable(users) {
        const container = document.getElementById('users-content');
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>รายการผู้ใช้ (${users.length} คน)</h3>
                <button class="btn btn-primary" onclick="window.AdminModals.showCreateUserModal()">
                    <i class="fas fa-plus"></i> เพิ่มผู้ใช้ใหม่
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ชื่อ</th>
                            <th>อีเมล</th>
                            <th>สถานะ</th>
                            <th>วันที่สมัคร</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.user_id}</td>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>
                                    <span class="badge bg-${user.role_id === 1 ? 'danger' : 'success'}">
                                        ${user.role_id === 1 ? 'ผู้ดูแล' : 'ผู้ใช้'}
                                    </span>
                                </td>
                                <td>${new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning me-1" onclick="window.AdminCRUD.editUser(${user.user_id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${user.role_id !== 1 ? `
                                        <button class="btn btn-sm btn-danger" onclick="window.AdminCRUD.deleteUser(${user.user_id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteUser(userId) {
        if (!confirm('ต้องการลบผู้ใช้นี้หรือไม่?')) return;

        try {
            await this.apiCall(`/users/${userId}`, { method: 'DELETE' });
            this.showToast('ลบผู้ใช้สำเร็จ');
            this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('ไม่สามารถลบผู้ใช้ได้', 'error');
        }
    }

    // === ROOMS CRUD ===
    async loadRooms() {
        try {
            const data = await this.apiCall('/rooms');
            this.displayRoomsTable(data.rooms);
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showToast('ไม่สามารถโหลดข้อมูลห้องได้', 'error');
        }
    }

    displayRoomsTable(rooms) {
        const container = document.getElementById('rooms-content');
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>รายการห้อง (${rooms.length} ห้อง)</h3>
                <button class="btn btn-primary" onclick="window.AdminModals.showCreateRoomModal()">
                    <i class="fas fa-plus"></i> เพิ่มห้องใหม่
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ชื่อห้อง</th>
                            <th>ความจุ</th>
                            <th>สถานะ</th>
                            <th>ราคา/ชม.</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rooms.map(room => `
                            <tr>
                                <td>${room.room_id}</td>
                                <td>${room.name}</td>
                                <td>${room.capacity} คน</td>
                                <td>
                                    <span class="badge bg-${room.status === 'available' ? 'success' : 'warning'}">
                                        ${room.status === 'available' ? 'ว่าง' : 'ไม่ว่าง'}
                                    </span>
                                </td>
                                <td>฿${room.hourly_rate}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning me-1" onclick="window.AdminCRUD.editRoom(${room.room_id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="window.AdminCRUD.deleteRoom(${room.room_id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteRoom(roomId) {
        if (!confirm('ต้องการลบห้องนี้หรือไม่?')) return;

        try {
            await this.apiCall(`/rooms/${roomId}`, { method: 'DELETE' });
            this.showToast('ลบห้องสำเร็จ');
            this.loadRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showToast('ไม่สามารถลบห้องได้', 'error');
        }
    }

    // === MENU CRUD ===
    async loadMenu() {
        try {
            const data = await this.apiCall('/menu');
            this.displayMenuTable(data.menu);
        } catch (error) {
            console.error('Error loading menu:', error);
            this.showToast('ไม่สามารถโหลดข้อมูลเมนูได้', 'error');
        }
    }

    displayMenuTable(menuItems) {
        const container = document.getElementById('menu-content');
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>รายการเมนู (${menuItems.length} รายการ)</h3>
                <button class="btn btn-primary" onclick="window.AdminModals.showCreateMenuModal()">
                    <i class="fas fa-plus"></i> เพิ่มเมนูใหม่
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ชื่อเมนู</th>
                            <th>หมวดหมู่</th>
                            <th>ราคา</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${menuItems.map(item => `
                            <tr>
                                <td>${item.menu_id}</td>
                                <td>${item.name}</td>
                                <td>${item.category_name || 'ไม่ระบุ'}</td>
                                <td>฿${item.price}</td>
                                <td>
                                    <span class="badge bg-${item.available ? 'success' : 'secondary'}">
                                        ${item.available ? 'พร้อมจำหน่าย' : 'ไม่พร้อม'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-warning me-1" onclick="window.AdminCRUD.editMenuItem(${item.menu_id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="window.AdminCRUD.deleteMenuItem(${item.menu_id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteMenuItem(menuId) {
        if (!confirm('ต้องการลบรายการเมนูนี้หรือไม่?')) return;

        try {
            await this.apiCall(`/menu/${menuId}`, { method: 'DELETE' });
            this.showToast('ลบรายการเมนูสำเร็จ');
            this.loadMenu();
        } catch (error) {
            console.error('Error deleting menu item:', error);
            this.showToast('ไม่สามารถลบรายการเมนูได้', 'error');
        }
    }

    // === BOOKINGS ===
    async loadBookings() {
        try {
            const data = await this.apiCall('/bookings');
            this.displayBookingsTable(data.bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showToast('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
        }
    }

    displayBookingsTable(bookings) {
        const container = document.getElementById('bookings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>รายการจอง (${bookings.length} รายการ)</h3>
            </div>
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ผู้จอง</th>
                            <th>ห้อง</th>
                            <th>วันที่</th>
                            <th>เวลา</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(booking => `
                            <tr>
                                <td>${booking.booking_id}</td>
                                <td>${booking.user_name || 'ไม่ระบุ'}</td>
                                <td>${booking.room_name || 'ไม่ระบุ'}</td>
                                <td>${new Date(booking.start_time).toLocaleDateString('th-TH')}</td>
                                <td>${new Date(booking.start_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</td>
                                <td>
                                    <span class="badge bg-${
                                        booking.status === 'confirmed' ? 'success' : 
                                        booking.status === 'pending' ? 'warning' : 'danger'
                                    }">
                                        ${
                                            booking.status === 'confirmed' ? 'ยืนยันแล้ว' :
                                            booking.status === 'pending' ? 'รอยืนยัน' : 'ยกเลิก'
                                        }
                                    </span>
                                </td>
                                <td>
                                    ${booking.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success me-1" onclick="window.AdminCRUD.confirmBooking(${booking.booking_id})">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger" onclick="window.AdminCRUD.cancelBooking(${booking.booking_id})">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async confirmBooking(bookingId) {
        try {
            await this.apiCall(`/bookings/${bookingId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'confirmed' })
            });
            this.showToast('ยืนยันการจองสำเร็จ');
            this.loadBookings();
        } catch (error) {
            console.error('Error confirming booking:', error);
            this.showToast('ไม่สามารถยืนยันการจองได้', 'error');
        }
    }

    async cancelBooking(bookingId) {
        if (!confirm('ต้องการยกเลิกการจองนี้หรือไม่?')) return;

        try {
            await this.apiCall(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
            this.showToast('ยกเลิกการจองสำเร็จ');
            this.loadBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showToast('ไม่สามารถยกเลิกการจองได้', 'error');
        }
    }

    // === MODAL METHODS (Placeholder for now) ===
    showCreateUserModal() {
        alert('ฟีเจอร์เพิ่มผู้ใช้ - กำลังพัฒนา');
    }

    showCreateRoomModal() {
        alert('ฟีเจอร์เพิ่มห้อง - กำลังพัฒนา');
    }

    showCreateMenuModal() {
        alert('ฟีเจอร์เพิ่มเมนู - กำลังพัฒนา');
    }

    editUser(userId) {
        alert(`แก้ไขผู้ใช้ ID: ${userId} - กำลังพัฒนา`);
    }

    editRoom(roomId) {
        alert(`แก้ไขห้อง ID: ${roomId} - กำลังพัฒนา`);
    }

    editMenuItem(menuId) {
        alert(`แก้ไขเมนู ID: ${menuId} - กำลังพัฒนา`);
    }
}

// Initialize CRUD system
window.AdminCRUD = new AdminCRUD();