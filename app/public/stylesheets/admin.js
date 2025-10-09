// ==========================================
// Admin Page JavaScript
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
    
    // Check admin authentication
    checkAdminAuth();
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Load admin statistics
    loadAdminStats();
});

// Check admin authentication
async function checkAdminAuth() {
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
            
            // Check if user is admin
            if (data.user.role_id !== 1) {
                alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                window.location.href = '/dashboard';
                return;
            }
            
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

// Update user information
function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (userName) {
        userName.textContent = user.name;
    }
    
    if (welcomeMessage) {
        welcomeMessage.textContent = `ยินดีต้อนรับผู้ดูแลระบบ ${user.name}`;
    }
}

// Logout function
function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/';
    }
}

// Load admin statistics
async function loadAdminStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStats(stats);
        } else {
            // Show default values if endpoint doesn't exist
            updateStats({
                totalUsers: 0,
                usersChange: 0,
                totalRooms: 0,
                roomsAvailable: 0,
                totalBookings: 0,
                bookingsChange: 0,
                totalRevenue: 0,
                revenueChange: 0
            });
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        // Show default values on error
        updateStats({
            totalUsers: 0,
            usersChange: 0,
            totalRooms: 0,
            roomsAvailable: 0,
            totalBookings: 0,
            bookingsChange: 0,
            totalRevenue: 0,
            revenueChange: 0
        });
    }
}

// Update statistics display
function updateStats(stats) {
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        usersChange: document.getElementById('usersChange'),
        totalRooms: document.getElementById('totalRooms'),
        roomsAvailable: document.getElementById('roomsAvailable'),
        totalBookings: document.getElementById('totalBookings'),
        bookingsChange: document.getElementById('bookingsChange'),
        totalRevenue: document.getElementById('totalRevenue'),
        revenueChange: document.getElementById('revenueChange')
    };
    
    if (elements.totalUsers) {
        elements.totalUsers.textContent = stats.totalUsers || '0';
    }
    
    if (elements.usersChange) {
        elements.usersChange.textContent = `+${stats.usersChange || 0} ใหม่วันนี้`;
    }
    
    if (elements.totalRooms) {
        elements.totalRooms.textContent = stats.totalRooms || '0';
    }
    
    if (elements.roomsAvailable) {
        elements.roomsAvailable.textContent = `${stats.roomsAvailable || 0} ห้องว่าง`;
    }
    
    if (elements.totalBookings) {
        elements.totalBookings.textContent = stats.totalBookings || '0';
    }
    
    if (elements.bookingsChange) {
        elements.bookingsChange.textContent = `+${stats.bookingsChange || 0} ใหม่วันนี้`;
    }
    
    if (elements.totalRevenue) {
        elements.totalRevenue.textContent = `฿${(stats.totalRevenue || 0).toLocaleString()}`;
    }
    
    if (elements.revenueChange) {
        elements.revenueChange.textContent = `฿${(stats.revenueChange || 0).toLocaleString()} เพิ่มขึ้น`;
    }
}

// Show management sections
function showManageRooms() {
    hideAllSections();
    const section = document.getElementById('manageRooms');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    loadRooms();
}

function showManageBookings() {
    hideAllSections();
    const section = document.getElementById('manageBookings');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    loadBookings();
}

function showManageUsers() {
    hideAllSections();
    const section = document.getElementById('manageUsers');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    loadUsers();
}

function showReports() {
    hideAllSections();
    const section = document.getElementById('reports');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    loadReports();
}

function hideAllSections() {
    const sections = document.querySelectorAll('.management-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
}

// Load rooms data
async function loadRooms() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div></td></tr>';
    
    try {
        const response = await fetch('/api/admin/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const rooms = await response.json();
            displayRooms(rooms);
        } else {
            throw new Error('Failed to load rooms');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
}

// Display rooms in table
function displayRooms(rooms) {
    const tbody = document.getElementById('roomsTableBody');
    
    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีข้อมูลห้อง</td></tr>';
        return;
    }
    
    tbody.innerHTML = rooms.map(room => `
        <tr>
            <td>${room.room_id}</td>
            <td>${room.room_name}</td>
            <td>${room.capacity} คน</td>
            <td>฿${room.price_per_hour}/ชม.</td>
            <td>
                <span class="status-badge ${room.status}">
                    ${getStatusText(room.status)}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-table btn-edit" onclick="editRoom(${room.room_id})">
                        <i class="fas fa-edit"></i>
                        แก้ไข
                    </button>
                    <button class="btn-table btn-delete" onclick="deleteRoom(${room.room_id})">
                        <i class="fas fa-trash"></i>
                        ลบ
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load bookings data
async function loadBookings() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div></td></tr>';
    
    try {
        const response = await fetch('/api/admin/bookings', {
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
}

// Display bookings in table
function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่มีข้อมูลการจอง</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.booking_id}</td>
            <td>${booking.user_name}</td>
            <td>${booking.room_name}</td>
            <td>${formatDate(booking.booking_date)}</td>
            <td>${booking.start_time} - ${booking.end_time}</td>
            <td>
                <span class="status-badge ${booking.status}">
                    ${getBookingStatusText(booking.status)}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-table btn-view" onclick="viewBooking(${booking.booking_id})">
                        <i class="fas fa-eye"></i>
                        ดู
                    </button>
                    ${booking.status === 'pending' ? `
                        <button class="btn-table btn-edit" onclick="confirmBooking(${booking.booking_id})">
                            <i class="fas fa-check"></i>
                            ยืนยัน
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Load users data
async function loadUsers() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div></td></tr>';
    
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีข้อมูลผู้ใช้</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${getRoleText(user.role_id)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-table btn-view" onclick="viewUser(${user.user_id})">
                        <i class="fas fa-eye"></i>
                        ดู
                    </button>
                    <button class="btn-table btn-edit" onclick="editUser(${user.user_id})">
                        <i class="fas fa-edit"></i>
                        แก้ไข
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'available': 'ว่าง',
        'occupied': 'ใช้งาน',
        'maintenance': 'ปรับปรุง'
    };
    return statusMap[status] || status;
}

function getBookingStatusText(status) {
    const statusMap = {
        'confirmed': 'ยืนยันแล้ว',
        'pending': 'รอยืนยัน',
        'cancelled': 'ยกเลิกแล้ว',
        'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
}

function getRoleText(roleId) {
    const roleMap = {
        1: 'ผู้ดูแลระบบ',
        2: 'พนักงาน',
        3: 'ลูกค้า'
    };
    return roleMap[roleId] || 'ไม่ระบุ';
}

function formatDate(dateString) {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
}

// ===========================================
// ROOM MANAGEMENT FUNCTIONS
// ===========================================

// Show add room form
function showAddRoomForm() {
    clearRoomForm();
    document.getElementById('roomModalTitle').textContent = 'เพิ่มห้องใหม่';
    document.getElementById('roomModal').style.display = 'flex';
}

// Edit room
async function editRoom(roomId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const room = await response.json();
            populateRoomForm(room);
            document.getElementById('roomModalTitle').textContent = 'แก้ไขห้อง';
            document.getElementById('roomModal').style.display = 'flex';
        } else {
            showToast('ไม่สามารถโหลดข้อมูลห้องได้', 'error');
        }
    } catch (error) {
        console.error('Error loading room:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// Delete room
function deleteRoom(roomId) {
    showConfirmModal(
        'ลบห้อง',
        'คุณต้องการลบห้องนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
        () => performDeleteRoom(roomId)
    );
}

async function performDeleteRoom(roomId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('ลบห้องสำเร็จ', 'success');
            loadRooms();
        } else {
            const error = await response.json();
            showToast(error.message || 'ไม่สามารถลบห้องได้', 'error');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
        hideLoading();
        closeConfirmModal();
    }
}

// Room form functions
function clearRoomForm() {
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    
    // Clear checkboxes
    const checkboxes = document.querySelectorAll('#roomForm input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
}

function populateRoomForm(room) {
    document.getElementById('roomId').value = room.room_id;
    document.getElementById('roomName').value = room.room_name;
    document.getElementById('roomType').value = room.type_id;
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomPrice').value = room.price_per_hour;
    document.getElementById('roomStatus').value = room.status;
    document.getElementById('roomDescription').value = room.description || '';
    
    // Set features checkboxes
    if (room.features) {
        const features = Array.isArray(room.features) ? room.features : room.features.split(',');
        features.forEach(feature => {
            const checkbox = document.querySelector(`input[name="features"][value="${feature.trim()}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
    clearRoomForm();
}

// Handle room form submission
document.addEventListener('DOMContentLoaded', function() {
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveRoom();
        });
    }
});

async function saveRoom() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const formData = new FormData(document.getElementById('roomForm'));
    const roomId = formData.get('roomId');
    
    // Get selected features
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
        .map(cb => cb.value);
    
    const roomData = {
        name: formData.get('name'),
        type_id: parseInt(formData.get('type_id')),
        capacity: parseInt(formData.get('capacity')),
        hourly_price: parseFloat(formData.get('hourly_price')),
        status: formData.get('status'),
        description: formData.get('description'),
        features: features.join(',')
    };
    
    try {
        showLoading();
        const url = roomId ? `/api/admin/rooms/${roomId}` : '/api/admin/rooms';
        const method = roomId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(roomData)
        });
        
        if (response.ok) {
            showToast(roomId ? 'อัปเดตห้องสำเร็จ' : 'เพิ่มห้องสำเร็จ', 'success');
            closeRoomModal();
            loadRooms();
        } else {
            const error = await response.json();
            showToast(error.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    } catch (error) {
        console.error('Error saving room:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// ===========================================
// USER MANAGEMENT FUNCTIONS
// ===========================================

// Show add user form
function showAddUserForm() {
    clearUserForm();
    document.getElementById('userModalTitle').textContent = 'เพิ่มผู้ใช้ใหม่';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    document.getElementById('userModal').style.display = 'flex';
}

// Edit user
async function editUser(userId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            populateUserForm(user);
            document.getElementById('userModalTitle').textContent = 'แก้ไขผู้ใช้';
            document.getElementById('passwordGroup').style.display = 'none';
            document.getElementById('userPassword').required = false;
            document.getElementById('userModal').style.display = 'flex';
        } else {
            showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// View user details
function viewUser(userId) {
    editUser(userId); // For now, just use edit form as view
}

// User form functions
function clearUserForm() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
}

function populateUserForm(user) {
    document.getElementById('userId').value = user.user_id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userRole').value = user.role_id;
    document.getElementById('userStatus').value = user.status || 'active';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    clearUserForm();
}

// Handle user form submission
document.addEventListener('DOMContentLoaded', function() {
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveUser();
        });
    }
});

async function saveUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const formData = new FormData(document.getElementById('userForm'));
    const userId = formData.get('userId');
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role_id: parseInt(formData.get('role_id')),
        status: formData.get('status')
    };
    
    // Add password for new users
    if (!userId && formData.get('password')) {
        userData.password = formData.get('password');
    }
    
    try {
        showLoading();
        const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showToast(userId ? 'อัปเดตผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ', 'success');
            closeUserModal();
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// ===========================================
// BOOKING MANAGEMENT FUNCTIONS
// ===========================================

// View booking details
async function viewBooking(bookingId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const booking = await response.json();
            showBookingDetails(booking);
        } else {
            showToast('ไม่สามารถโหลดรายละเอียดการจองได้', 'error');
        }
    } catch (error) {
        console.error('Error loading booking:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

function showBookingDetails(booking) {
    const detailsContainer = document.getElementById('bookingDetails');
    detailsContainer.innerHTML = `
        <div class="booking-info-grid">
            <div class="booking-info-item">
                <label>รหัสการจอง:</label>
                <span>${booking.booking_id}</span>
            </div>
            <div class="booking-info-item">
                <label>ลูกค้า:</label>
                <span>${booking.user_name}</span>
            </div>
            <div class="booking-info-item">
                <label>อีเมล:</label>
                <span>${booking.user_email}</span>
            </div>
            <div class="booking-info-item">
                <label>เบอร์โทร:</label>
                <span>${booking.user_phone || 'ไม่ระบุ'}</span>
            </div>
            <div class="booking-info-item">
                <label>ห้อง:</label>
                <span>${booking.room_name}</span>
            </div>
            <div class="booking-info-item">
                <label>วันที่จอง:</label>
                <span>${formatDate(booking.booking_date)}</span>
            </div>
            <div class="booking-info-item">
                <label>เวลา:</label>
                <span>${booking.start_time} - ${booking.end_time}</span>
            </div>
            <div class="booking-info-item">
                <label>ระยะเวลา:</label>
                <span>${booking.duration} ชั่วโมง</span>
            </div>
            <div class="booking-info-item">
                <label>ราคา:</label>
                <span>฿${booking.total_amount}</span>
            </div>
            <div class="booking-info-item">
                <label>สถานะ:</label>
                <span class="status-badge ${booking.status}">${getBookingStatusText(booking.status)}</span>
            </div>
            <div class="booking-info-item full-width">
                <label>หมายเหตุ:</label>
                <span>${booking.notes || 'ไม่มี'}</span>
            </div>
        </div>
    `;
    
    // Set current status in dropdown
    document.getElementById('bookingStatusUpdate').value = booking.status;
    document.getElementById('adminNotes').value = booking.admin_notes || '';
    
    // Store current booking ID
    window.currentBookingId = booking.booking_id;
    
    document.getElementById('bookingModal').style.display = 'flex';
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
    window.currentBookingId = null;
}

// Confirm booking
function confirmBooking(bookingId) {
    showConfirmModal(
        'ยืนยันการจอง',
        'คุณต้องการยืนยันการจองนี้หรือไม่?',
        () => updateBookingStatusDirect(bookingId, 'confirmed')
    );
}

// Update booking status
async function updateBookingStatus() {
    if (!window.currentBookingId) return;
    
    const newStatus = document.getElementById('bookingStatusUpdate').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    await updateBookingStatusWithNotes(window.currentBookingId, newStatus, adminNotes);
}

async function updateBookingStatusDirect(bookingId, status) {
    await updateBookingStatusWithNotes(bookingId, status, '');
}

async function updateBookingStatusWithNotes(bookingId, status, notes) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: status,
                admin_notes: notes
            })
        });
        
        if (response.ok) {
            showToast('อัปเดตสถานะการจองสำเร็จ', 'success');
            closeBookingModal();
            closeConfirmModal();
            loadBookings();
        } else {
            const error = await response.json();
            showToast(error.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
    } finally {
        hideLoading();
    }
}

// Delete booking
function deleteBooking() {
    if (!window.currentBookingId) return;
    
    showConfirmModal(
        'ลบการจอง',
        'คุณต้องการลบการจองนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
        () => performDeleteBooking(window.currentBookingId)
    );
}

async function performDeleteBooking(bookingId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('ลบการจองสำเร็จ', 'success');
            closeBookingModal();
            closeConfirmModal();
            loadBookings();
        } else {
            const error = await response.json();
            showToast(error.message || 'ไม่สามารถลบการจองได้', 'error');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// ===========================================
// FILTER FUNCTIONS
// ===========================================

// Filter bookings
function filterBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter').value;
    const dateFilter = document.getElementById('bookingDateFilter').value;
    
    // Implement filtering logic here
    loadBookings(); // For now, just reload
}

// Filter users
function filterUsers() {
    const roleFilter = document.getElementById('userRoleFilter').value;
    const searchFilter = document.getElementById('userSearchInput').value;
    
    // Implement filtering logic here
    loadUsers(); // For now, just reload
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Show loading overlay
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show confirmation modal
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmButton');
    confirmBtn.onclick = onConfirm;
    
    document.getElementById('confirmModal').style.display = 'flex';
}

// Close confirmation modal
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 5000);
}

// Load reports (placeholder)
function loadReports() {
    // Implement reports loading here
    console.log('Loading reports...');
}

function editUser(userId) {
    alert(`แก้ไขผู้ใช้ ID: ${userId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
}

function filterBookings() {
    alert('ฟีเจอร์กรองการจองจะพร้อมใช้งานเร็วๆ นี้');
}

function filterUsers() {
    alert('ฟีเจอร์ค้นหาผู้ใช้จะพร้อมใช้งานเร็วๆ นี้');
}

function loadReports() {
    alert('ฟีเจอร์รายงานจะพร้อมใช้งานเร็วๆ นี้');
}
