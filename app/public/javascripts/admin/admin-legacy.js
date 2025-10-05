// ==========================================
// Admin Page JavaScript - Modern Dashboard
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin dashboard
    initializeAdmin();
    
    // Check admin authentication
    checkAdminAuth();
    
    // Setup navigation
    setupNavigation();
    
    // Setup user dropdown
    setupUserDropdown();
    
    // Load admin statistics
    loadAdminStats();
    
    // Setup section navigation
    setupSectionNavigation();
});

// Initialize admin dashboard
function initializeAdmin() {
    console.log('🚀 Admin Dashboard initializing...');
    
    // Mobile navigation toggle
    const adminNavToggle = document.getElementById('adminNavToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    
    if (adminNavToggle && adminSidebar) {
        adminNavToggle.addEventListener('click', function() {
            adminSidebar.classList.toggle('show');
            adminNavToggle.classList.toggle('active');
        });
    }
    
    // Logout functionality
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', logout);
    }
}

// Setup navigation system
function setupNavigation() {
    // Handle both sidebar and navbar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
    const navLinks = document.querySelectorAll('.admin-nav-link[data-section]');
    
    [...sidebarLinks, ...navLinks].forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
            
            // Update active states
            updateActiveNavigation(sectionId);
        });
    });
}

// Setup user dropdown
function setupUserDropdown() {
    const adminUserBtn = document.getElementById('adminUserBtn');
    const adminDropdown = document.getElementById('adminDropdown');
    
    if (adminUserBtn && adminDropdown) {
        adminUserBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            adminDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            adminDropdown.classList.remove('show');
        });
    }
}

// Setup section navigation
function setupSectionNavigation() {
    // Show dashboard by default
    showSection('dashboard');
    
    // Load content for each section when first accessed
    const sections = ['users', 'rooms', 'menu', 'bookings', 'reports'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId + '-section');
        if (section) {
            // Add intersection observer to lazy load content
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !section.dataset.loaded) {
                        loadSectionContent(sectionId);
                        section.dataset.loaded = 'true';
                    }
                });
            });
            observer.observe(section);
        }
    });
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Load content if not loaded
        if (!targetSection.dataset.loaded) {
            loadSectionContent(sectionId);
            targetSection.dataset.loaded = 'true';
        }
    }
    
    // Update URL hash
    window.location.hash = sectionId;
}

// Update active navigation states
function updateActiveNavigation(sectionId) {
    // Update sidebar links
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Update navbar links
    const navLinks = document.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });
}

// Load content for specific section
function loadSectionContent(sectionId) {
    console.log(`📄 Loading content for section: ${sectionId}`);
    
    switch(sectionId) {
        case 'users':
            loadUsersContent();
            break;
        case 'rooms':
            loadRoomsContent();
            break;
        case 'menu':
            loadMenuContent();
            break;
        case 'bookings':
            loadBookingsContent();
            break;
        case 'reports':
            loadReportsContent();
            break;
        default:
            console.log(`No loader defined for section: ${sectionId}`);
    }
}

// Load Users Content
async function loadUsersContent() {
    const contentDiv = document.getElementById('users-content');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsersTable(users, contentDiv);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้</p>
            </div>
        `;
    }
}

// Load Rooms Content
async function loadRoomsContent() {
    const contentDiv = document.getElementById('rooms-content');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/api/admin/rooms', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const rooms = await response.json();
            displayRoomsTable(rooms, contentDiv);
        } else {
            throw new Error('Failed to load rooms');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง</p>
            </div>
        `;
    }
}

// Load Menu Content
async function loadMenuContent() {
    const contentDiv = document.getElementById('menu-content');
    if (!contentDiv) return;
    
    // Use existing menu management function
    showManageMenu();
}

// Load Bookings Content
async function loadBookingsContent() {
    const contentDiv = document.getElementById('bookings-content');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/api/bookings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            displayBookingsTable(bookings, contentDiv);
        } else {
            throw new Error('Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง</p>
            </div>
        `;
    }
}

// Load Reports Content
function loadReportsContent() {
    const reportsSection = document.getElementById('reports-section');
    if (!reportsSection) return;
    
    console.log('📊 Loading reports and analytics...');
    
    // Initialize charts (placeholder for now)
    setTimeout(() => {
        const charts = reportsSection.querySelectorAll('.chart-placeholder');
        charts.forEach(chart => {
            const chartType = chart.parentElement.id;
            console.log(`Initializing chart: ${chartType}`);
        });
    }, 1000);
}

// Display Users Table
function displayUsersTable(users, container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ชื่อผู้ใช้</th>
                        <th>อีเมล</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>เบอร์โทร</th>
                        <th>สิทธิ์</th>
                        <th>วันที่สมัคร</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.user_id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.first_name} ${user.last_name}</td>
                            <td>${user.phone || '-'}</td>
                            <td>
                                <span class="role-badge ${user.role_id === 1 ? 'admin' : 'user'}">
                                    ${user.role_id === 1 ? 'ผู้ดูแล' : 'สมาชิก'}
                                </span>
                            </td>
                            <td>${new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display Rooms Table
function displayRoomsTable(rooms, container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ชื่อห้อง</th>
                        <th>ประเภท</th>
                        <th>ความจุ</th>
                        <th>ราคา/ชม</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rooms.map(room => `
                        <tr>
                            <td>${room.room_id}</td>
                            <td>${room.room_name}</td>
                            <td>${room.type_name || '-'}</td>
                            <td>${room.capacity} คน</td>
                            <td>฿${room.price_per_hour}</td>
                            <td>
                                <span class="status-badge ${room.status}">
                                    ${room.status === 'available' ? 'ว่าง' : 
                                      room.status === 'occupied' ? 'ไม่ว่าง' : 
                                      room.status === 'maintenance' ? 'ซ่อมบำรุง' : room.status}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-primary" onclick="editRoom(${room.room_id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display Bookings Table
function displayBookingsTable(bookings, container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ผู้จอง</th>
                        <th>ห้อง</th>
                        <th>วันที่จอง</th>
                        <th>เวลา</th>
                        <th>ระยะเวลา</th>
                        <th>ราคา</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>${booking.booking_id}</td>
                            <td>${booking.username || booking.user_id}</td>
                            <td>${booking.room_name || booking.room_id}</td>
                            <td>${new Date(booking.booking_date).toLocaleDateString('th-TH')}</td>
                            <td>${booking.start_time}</td>
                            <td>${booking.duration_hours} ชม.</td>
                            <td>฿${booking.total_price}</td>
                            <td>
                                <span class="status-badge ${booking.status}">
                                    ${booking.status === 'pending' ? 'รอยืนยัน' : 
                                      booking.status === 'confirmed' ? 'ยืนยันแล้ว' : 
                                      booking.status === 'cancelled' ? 'ยกเลิก' : booking.status}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-success" onclick="confirmBooking(${booking.booking_id})">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="cancelBooking(${booking.booking_id})">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

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

function showManageMenu() {
    hideAllSections();
    const section = document.getElementById('manageMenu');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    showMenuItems(); // Show menu items tab by default
    loadMenuItems();
    loadMenuCategories();
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

// Placeholder functions for admin actions
function showAddRoomForm() {
    alert('ฟีเจอร์เพิ่มห้องจะพร้อมใช้งานเร็วๆ นี้');
}

function editRoom(roomId) {
    alert(`แก้ไขห้อง ID: ${roomId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
}

function deleteRoom(roomId) {
    if (confirm('คุณต้องการลบห้องนี้หรือไม่?')) {
        alert(`ลบห้อง ID: ${roomId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
    }
}

function viewBooking(bookingId) {
    alert(`ดูการจอง ID: ${bookingId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
}

function confirmBooking(bookingId) {
    if (confirm('คุณต้องการยืนยันการจองนี้หรือไม่?')) {
        alert(`ยืนยันการจอง ID: ${bookingId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
    }
}

function viewUser(userId) {
    alert(`ดูผู้ใช้ ID: ${userId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
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

// ==========================================
// Menu Management Functions
// ==========================================

function showMenuItems() {
    // Switch tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    document.querySelector('.tab-button:first-child').classList.add('active');
    document.getElementById('menuItemsTab').style.display = 'block';
    
    loadMenuItems();
}

function showMenuCategories() {
    // Switch tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    document.querySelector('.tab-button:last-child').classList.add('active');
    document.getElementById('categoriesTab').style.display = 'block';
    
    loadMenuCategories();
}

async function loadMenuItems() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const tbody = document.getElementById('menuTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div></td></tr>';
    
    try {
        const response = await fetch('/api/admin/menu', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMenuItems(data.menu);
        } else {
            throw new Error('Failed to load menu items');
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-error">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

function displayMenuItems(menuItems) {
    const tbody = document.getElementById('menuTableBody');
    
    if (menuItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีรายการอาหาร</td></tr>';
        return;
    }
    
    tbody.innerHTML = menuItems.map(item => `
        <tr>
            <td>${item.menu_id}</td>
            <td>${item.name}</td>
            <td>${item.category_name || 'ไม่ระบุ'}</td>
            <td>฿${parseFloat(item.price).toFixed(2)}</td>
            <td>
                <span class="status ${item.available ? 'available' : 'unavailable'}">
                    ${item.available ? 'พร้อมจำหน่าย' : 'หมด'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action edit" onclick="editMenuItem(${item.menu_id})" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteMenuItem(${item.menu_id})" title="ลบ">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadMenuCategories() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const container = document.getElementById('categoriesGrid');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>';
    
    try {
        const response = await fetch('/api/admin/menu-categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMenuCategories(data.categories);
        } else {
            throw new Error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = '<div class="text-center text-error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function displayMenuCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="text-center">ไม่มีหมวดหมู่</div>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="category-card">
            <h4>${category.category_name}</h4>
            <div class="category-actions">
                <button class="btn btn-sm btn-outline" onclick="editCategory(${category.category_id})">
                    <i class="fas fa-edit"></i>
                    แก้ไข
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.category_id})">
                    <i class="fas fa-trash"></i>
                    ลบ
                </button>
            </div>
        </div>
    `).join('');
}

function showAddMenuForm() {
    // Create modal for adding menu item
    const modalHtml = `
        <div class="modal-overlay" id="menuModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>เพิ่มรายการอาหารใหม่</h3>
                    <button class="modal-close" onclick="closeMenuModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addMenuForm">
                        <div class="form-group">
                            <label for="menuName">ชื่อรายการ *</label>
                            <input type="text" id="menuName" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="menuCategory">หมวดหมู่ *</label>
                            <select id="menuCategory" name="category_id" required>
                                <option value="">เลือกหมวดหมู่</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="menuPrice">ราคา (บาท) *</label>
                            <input type="number" id="menuPrice" name="price" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="menuDescription">คำอธิบาย</label>
                            <textarea id="menuDescription" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="menuAvailable" name="available" checked>
                                พร้อมจำหน่าย
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeMenuModal()">ยกเลิก</button>
                    <button class="btn btn-primary" onclick="submitMenuForm()">บันทึก</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Load categories for dropdown
    loadCategoriesForDropdown();
}

async function loadCategoriesForDropdown() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/admin/menu-categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('menuCategory');
            
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function closeMenuModal() {
    const modal = document.getElementById('menuModal');
    if (modal) {
        modal.remove();
    }
}

async function submitMenuForm() {
    const form = document.getElementById('addMenuForm');
    const formData = new FormData(form);
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    const data = {
        name: formData.get('name'),
        category_id: parseInt(formData.get('category_id')),
        price: parseFloat(formData.get('price')),
        description: formData.get('description'),
        available: formData.get('available') === 'on'
    };
    
    try {
        const response = await fetch('/api/admin/menu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('เพิ่มรายการอาหารสำเร็จ');
            closeMenuModal();
            loadMenuItems(); // Reload the menu items
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.error || 'ไม่สามารถเพิ่มรายการได้'));
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มรายการ');
    }
}

function showAddCategoryForm() {
    const categoryName = prompt('ชื่อหมวดหมู่ใหม่:');
    if (categoryName && categoryName.trim()) {
        addCategory(categoryName.trim());
    }
}

async function addCategory(categoryName) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/admin/menu-categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ category_name: categoryName })
        });
        
        if (response.ok) {
            alert('เพิ่มหมวดหมู่สำเร็จ');
            loadMenuCategories(); // Reload categories
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.error || 'ไม่สามารถเพิ่มหมวดหมู่ได้'));
        }
    } catch (error) {
        console.error('Error adding category:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่');
    }
}

function editMenuItem(itemId) {
    alert(`แก้ไขรายการอาหาร ID: ${itemId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
}

async function deleteMenuItem(itemId) {
    if (!confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/admin/menu/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('ลบรายการสำเร็จ');
            loadMenuItems(); // Reload the menu items
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.error || 'ไม่สามารถลบรายการได้'));
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
}

function editCategory(categoryId) {
    alert(`แก้ไขหมวดหมู่ ID: ${categoryId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
}

function deleteCategory(categoryId) {
    if (confirm('คุณต้องการลบหมวดหมู่นี้หรือไม่?')) {
        alert(`ลบหมวดหมู่ ID: ${categoryId} - ฟีเจอร์จะพร้อมใช้งานเร็วๆ นี้`);
    }
}

function loadReports() {
    alert('ฟีเจอร์รายงานจะพร้อมใช้งานเร็วๆ นี้');
}
