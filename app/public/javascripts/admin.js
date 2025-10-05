// ==========================================
// Admin Dashboard JavaScript - Complete CRUD System
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
    
    // Load recent activity
    loadRecentActivity();
    
    // Setup CRUD buttons
    setupCRUDButtons();
});

// Initialize admin dashboard
function initializeAdmin() {
    console.log('🚀 Admin Dashboard initializing...');
    
    // Check if admin status is already confirmed
    const adminStatus = localStorage.getItem('admin_status');
    const adminUser = localStorage.getItem('admin_user');
    
    if (adminStatus === 'confirmed' && adminUser) {
        try {
            const user = JSON.parse(adminUser);
            ensureAdminPanelVisible(user);
        } catch (error) {
            console.error('Error parsing stored admin user:', error);
        }
    }
    
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
    
    // Add admin panel persistence on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && localStorage.getItem('admin_status') === 'confirmed') {
            const adminUser = localStorage.getItem('admin_user');
            if (adminUser) {
                try {
                    ensureAdminPanelVisible(JSON.parse(adminUser));
                } catch (error) {
                    console.error('Error ensuring admin panel visibility:', error);
                }
            }
        }
    });
}

// Setup CRUD buttons
function setupCRUDButtons() {
    // Add event listeners after DOM is ready
    setTimeout(() => {
        // Add User Button
        const addUserBtn = document.querySelector('[onclick="createUser()"]');
        if (!addUserBtn) {
            // Create add user button if it doesn't exist
            const usersSection = document.getElementById('users-section');
            if (usersSection) {
                const addButton = document.createElement('button');
                addButton.className = 'btn btn-primary mb-3';
                addButton.innerHTML = '<i class="fas fa-plus"></i> เพิ่มผู้ใช้ใหม่';
                addButton.onclick = createUser;
                
                const contentDiv = document.getElementById('users-content');
                if (contentDiv) {
                    contentDiv.parentNode.insertBefore(addButton, contentDiv);
                }
            }
        }
        
        // Add Room Button
        const addRoomBtn = document.querySelector('[onclick="createRoom()"]');
        if (!addRoomBtn) {
            const roomsSection = document.getElementById('rooms-section');
            if (roomsSection) {
                const addButton = document.createElement('button');
                addButton.className = 'btn btn-primary mb-3';
                addButton.innerHTML = '<i class="fas fa-plus"></i> เพิ่มห้องใหม่';
                addButton.onclick = createRoom;
                
                const contentDiv = document.getElementById('rooms-content');
                if (contentDiv) {
                    contentDiv.parentNode.insertBefore(addButton, contentDiv);
                }
            }
        }
        
        // Add Menu Item Button
        const addMenuBtn = document.querySelector('[onclick="createMenuItem()"]');
        if (!addMenuBtn) {
            const menuSection = document.getElementById('menu-section');
            if (menuSection) {
                const addButton = document.createElement('button');
                addButton.className = 'btn btn-primary mb-3';
                addButton.innerHTML = '<i class="fas fa-plus"></i> เพิ่มรายการอาหาร';
                addButton.onclick = createMenuItem;
                
                const contentDiv = document.getElementById('menu-content');
                if (contentDiv) {
                    contentDiv.parentNode.insertBefore(addButton, contentDiv);
                }
            }
        }
    }, 1000);
}

// Setup navigation system
function setupNavigation() {
    // Handle both sidebar and navbar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
    const navLinks = document.querySelectorAll('.admin-nav-link[data-section]');
    const actionCards = document.querySelectorAll('.action-card[data-section]');
    
    // Add click handlers for navigation links
    [...sidebarLinks, ...navLinks].forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
            
            // Update active states
            updateActiveNavigation(sectionId);
        });
    });
    
    // Add click handlers for action cards
    actionCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
            
            // Update active states
            updateActiveNavigation(sectionId);
            
            // Add visual feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
        
        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
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
        
        // Setup CRUD buttons for this section
        setTimeout(() => setupCRUDButtons(), 500);
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
            const data = await response.json();
            displayUsersTable(data.users || [], contentDiv);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้</p>
                <button onclick="loadUsersContent()" class="btn btn-primary">ลองใหม่</button>
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
            const data = await response.json();
            displayRoomsTable(data.rooms || [], contentDiv);
        } else {
            throw new Error('Failed to load rooms');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง</p>
                <button onclick="loadRoomsContent()" class="btn btn-primary">ลองใหม่</button>
            </div>
        `;
    }
}

// Load Menu Content
async function loadMenuContent() {
    const contentDiv = document.getElementById('menu-content');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/api/admin/menu', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMenuTable(data.menu || [], contentDiv);
        } else {
            throw new Error('Failed to load menu');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลเมนู</p>
                <button onclick="loadMenuContent()" class="btn btn-primary">ลองใหม่</button>
            </div>
        `;
    }
}

// Load Bookings Content
async function loadBookingsContent() {
    const contentDiv = document.getElementById('bookings-content');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayBookingsTable(data.bookings || [], contentDiv);
        } else {
            throw new Error('Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง</p>
                <button onclick="loadBookingsContent()" class="btn btn-primary">ลองใหม่</button>
            </div>
        `;
    }
}

// Load Reports Content
function loadReportsContent() {
    const reportsSection = document.getElementById('reports-section');
    if (reportsSection) {
        console.log('📊 Reports section loaded');
        loadAdminStats(); // Refresh stats for reports
    }
}

// Check admin authentication
async function checkAdminAuth() {
    if (window.location.pathname === '/auth') {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No auth token found, redirecting to auth page');
        window.location.href = '/auth';
        return;
    }
    
    if (window.checkingAuth) {
        return;
    }
    
    window.checkingAuth = true;
    
    try {
        const response = await fetch('/api/admin/check-admin', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (!data.isAdmin || !data.user) {
                alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องเป็น admin)');
                window.location.href = '/dashboard';
                return;
            }
            
            updateUserInfo(data.user);
            ensureAdminPanelVisible(data.user);
            setupAdminSessionCheck();
            
        } else if (response.status === 403) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้า Admin (ต้องเป็นผู้ดูแลระบบ)');
            window.location.href = '/dashboard';
            return;
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Admin auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
        }
    } finally {
        window.checkingAuth = false;
    }
}

// Ensure admin panel remains visible
function ensureAdminPanelVisible(adminUser) {
    console.log('🔑 Ensuring admin panel visibility for:', adminUser.name);
    
    document.body.classList.add('admin-authenticated');
    localStorage.setItem('admin_status', 'confirmed');
    localStorage.setItem('admin_user', JSON.stringify(adminUser));
    
    const adminElements = document.querySelectorAll('.admin-only, [data-admin-only]');
    adminElements.forEach(element => {
        element.style.display = '';
        element.classList.remove('hidden');
    });
    
    const adminIndicator = document.querySelector('.admin-indicator');
    if (adminIndicator) {
        adminIndicator.textContent = '👑 Admin Mode';
        adminIndicator.classList.add('active');
    }
}

// Setup periodic admin session check
function setupAdminSessionCheck() {
    if (window.adminCheckInterval) {
        clearInterval(window.adminCheckInterval);
    }
    
    window.adminCheckInterval = setInterval(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const response = await fetch('/api/admin/check-admin', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.isAdmin) {
                    ensureAdminPanelVisible(data.user);
                } else {
                    alert('สิทธิ์ Admin หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่');
                    window.location.href = '/auth';
                }
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('admin_status');
                window.location.href = '/auth';
            }
        } catch (error) {
            console.error('Admin session check failed:', error);
        }
    }, 30000);
}

// Update user information display
function updateUserInfo(user) {
    const userNameElement = document.getElementById('adminUserName');
    if (userNameElement) {
        userNameElement.textContent = user.name || 'Admin User';
    }
    
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.textContent = `ยินดีต้อนรับ ${user.name || 'ผู้ดูแลระบบ'} - ภาพรวมการใช้งานระบบ`;
    }
}

// Logout function
function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_status');
        localStorage.removeItem('admin_user');
        
        if (window.adminCheckInterval) {
            clearInterval(window.adminCheckInterval);
        }
        
        document.body.classList.remove('admin-authenticated');
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
            const data = await response.json();
            const stats = data.stats || data;
            updateStats(stats);
        } else {
            updateStats({
                users: { total_users: 0, active_users: 0 },
                rooms: { total_rooms: 0, available_rooms: 0 },
                bookings: { total_bookings: 0, confirmed_bookings: 0 },
                revenue: { today_revenue: 0 }
            });
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        updateStats({
            users: { total_users: 0, active_users: 0 },
            rooms: { total_rooms: 0, available_rooms: 0 },
            bookings: { total_bookings: 0, confirmed_bookings: 0 },
            revenue: { today_revenue: 0 }
        });
    }
}

// Update statistics display
function updateStats(stats) {
    console.log('📊 Updating admin stats:', stats);
    
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
    
    const userStats = stats.users || {};
    const roomStats = stats.rooms || {};
    const bookingStats = stats.bookings || {};
    const revenueStats = stats.revenue || {};
    
    if (elements.totalUsers) {
        elements.totalUsers.textContent = userStats.total_users || stats.totalUsers || '0';
    }
    
    if (elements.usersChange) {
        const activeUsers = userStats.active_users || stats.usersChange || 0;
        elements.usersChange.textContent = `${activeUsers} ผู้ใช้ที่ใช้งานอยู่`;
    }
    
    if (elements.totalRooms) {
        elements.totalRooms.textContent = roomStats.total_rooms || stats.totalRooms || '0';
    }
    
    if (elements.roomsAvailable) {
        const availableRooms = roomStats.available_rooms || stats.roomsAvailable || 0;
        elements.roomsAvailable.textContent = `${availableRooms} ห้องว่าง`;
    }
    
    if (elements.totalBookings) {
        elements.totalBookings.textContent = bookingStats.total_bookings || stats.totalBookings || '0';
    }
    
    if (elements.bookingsChange) {
        const confirmedBookings = bookingStats.confirmed_bookings || stats.bookingsChange || 0;
        elements.bookingsChange.textContent = `${confirmedBookings} การจองที่ยืนยันแล้ว`;
    }
    
    if (elements.totalRevenue) {
        const todayRevenue = revenueStats.today_revenue || stats.totalRevenue || 0;
        elements.totalRevenue.textContent = `฿${Number(todayRevenue).toLocaleString()}`;
    }
    
    if (elements.revenueChange) {
        const revenueChange = stats.revenueChange || 0;
        elements.revenueChange.textContent = `฿${Number(revenueChange).toLocaleString()} เพิ่มขึ้น`;
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activityDiv = document.getElementById('recentActivity');
    if (!activityDiv) return;
    
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = data.stats || data;
            const recentBookings = stats.recent_bookings || [];
            
            if (recentBookings.length > 0) {
                const activityHTML = `
                    <div class="activity-list">
                        ${recentBookings.map(booking => `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <div class="activity-content">
                                    <h4>การจองใหม่</h4>
                                    <p>คุณ ${booking.user_name || 'ไม่ระบุชื่อ'} จอง ${booking.room_name || 'ห้องไม่ระบุ'}</p>
                                    <small>${new Date(booking.start_time).toLocaleString('th-TH')}</small>
                                </div>
                                <div class="activity-status status-${booking.status}">
                                    ${booking.status}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                activityDiv.innerHTML = activityHTML;
            } else {
                activityDiv.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-calendar-times"></i>
                        <p>ไม่มีกิจกรรมล่าสุด</p>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to load recent activity');
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดกิจกรรมล่าสุด</p>
            </div>
        `;
    }
}

// Display functions for tables
function displayUsersTable(users, container) {
    const tableHTML = `
        <div class="table-actions mb-3">
            <button class="btn btn-success" onclick="createUser()">
                <i class="fas fa-plus"></i> เพิ่มผู้ใช้ใหม่
            </button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ชื่อ</th>
                        <th>อีเมล</th>
                        <th>ประเภท</th>
                        <th>สถานะ</th>
                        <th>วันที่สมัคร</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.user_id}</td>
                            <td>${user.name || 'ไม่ระบุ'}</td>
                            <td>${user.email || 'ไม่ระบุ'}</td>
                            <td>${user.role_name || 'ไม่ระบุ'}</td>
                            <td><span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span></td>
                            <td>${new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHTML;
}

function displayRoomsTable(rooms, container) {
    const tableHTML = `
        <div class="table-actions mb-3">
            <button class="btn btn-success" onclick="createRoom()">
                <i class="fas fa-plus"></i> เพิ่มห้องใหม่
            </button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ชื่อห้อง</th>
                        <th>ประเภท</th>
                        <th>ความจุ</th>
                        <th>ราคา/ชั่วโมง</th>
                        <th>สถานะ</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rooms.map(room => `
                        <tr>
                            <td>${room.room_id}</td>
                            <td>${room.name || 'ไม่ระบุ'}</td>
                            <td>${room.type_name || 'ไม่ระบุ'}</td>
                            <td>${room.capacity} คน</td>
                            <td>฿${Number(room.hourly_rate || 0).toLocaleString()}</td>
                            <td><span class="status-badge status-${room.status || 'available'}">${room.status || 'available'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editRoom(${room.room_id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHTML;
}

function displayMenuTable(menu, container) {
    const tableHTML = `
        <div class="table-actions mb-3">
            <button class="btn btn-success" onclick="createMenuItem()">
                <i class="fas fa-plus"></i> เพิ่มรายการอาหาร
            </button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ชื่อรายการ</th>
                        <th>หมวดหมู่</th>
                        <th>ราคา</th>
                        <th>สถานะ</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${menu.map(item => `
                        <tr>
                            <td>${item.menu_id}</td>
                            <td>${item.name || 'ไม่ระบุ'}</td>
                            <td>${item.category_name || 'ไม่ระบุ'}</td>
                            <td>฿${Number(item.price).toLocaleString()}</td>
                            <td><span class="status-badge ${item.available ? 'status-available' : 'status-unavailable'}">${item.available ? 'พร้อมขาย' : 'หมด'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editMenuItem(${item.menu_id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.menu_id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHTML;
}

function displayBookingsTable(bookings, container) {
    const tableHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>ลูกค้า</th>
                        <th>ห้อง</th>
                        <th>วันที่</th>
                        <th>เวลา</th>
                        <th>ราคา</th>
                        <th>สถานะ</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>${booking.booking_id}</td>
                            <td>${booking.user_name || 'ไม่ระบุ'}</td>
                            <td>${booking.room_name || 'ไม่ระบุ'}</td>
                            <td>${new Date(booking.start_time).toLocaleDateString('th-TH')}</td>
                            <td>${new Date(booking.start_time).toLocaleTimeString('th-TH')} - ${new Date(booking.end_time).toLocaleTimeString('th-TH')}</td>
                            <td>฿${Number(booking.total_price || 0).toLocaleString()}</td>
                            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editBooking(${booking.booking_id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-warning" onclick="cancelBooking(${booking.booking_id})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHTML;
}

// ==========================================
// USER CRUD OPERATIONS
// ==========================================

// Create new user
function createUser() {
    showUserModal();
}

// Show user modal for create/edit
function showUserModal(user = null) {
    const isEdit = !!user;
    const modalHtml = `
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="userForm">
                            ${isEdit ? `<input type="hidden" id="userId" value="${user.user_id}">` : ''}
                            <div class="mb-3">
                                <label for="userName" class="form-label">ชื่อ</label>
                                <input type="text" class="form-control" id="userName" value="${user?.name || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="userEmail" class="form-label">อีเมล</label>
                                <input type="email" class="form-control" id="userEmail" value="${user?.email || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="userPassword" class="form-label">${isEdit ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน'}</label>
                                <input type="password" class="form-control" id="userPassword" ${!isEdit ? 'required' : ''}>
                            </div>
                            <div class="mb-3">
                                <label for="userRole" class="form-label">ประเภทผู้ใช้</label>
                                <select class="form-control" id="userRole" required>
                                    <option value="2" ${user?.role_id == 2 ? 'selected' : ''}>ผู้ใช้ทั่วไป</option>
                                    <option value="1" ${user?.role_id == 1 ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="button" class="btn btn-primary" onclick="saveUser(${isEdit})">
                            ${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal (handle both Bootstrap 5 and 4)
    try {
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    } catch (error) {
        // Fallback for older Bootstrap or jQuery modal
        $('#userModal').modal('show');
    }
    
    // Remove modal after closing
    document.getElementById('userModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Edit existing user
async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            showUserModal(userData.user);
        } else {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
    }
}

// Save user (create or update)
async function saveUser(isEdit = false) {
    const form = document.getElementById('userForm');
    const userId = document.getElementById('userId')?.value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role_id = document.getElementById('userRole').value;
    
    if (!name || !email || (!isEdit && !password)) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    const userData = { name, email, role_id };
    if (password) userData.password = password;
    
    try {
        const url = isEdit ? `/api/admin/users/${userId}` : '/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showNotification(isEdit ? 'แก้ไขผู้ใช้เรียบร้อยแล้ว' : 'เพิ่มผู้ใช้เรียบร้อยแล้ว', 'success');
            
            // Close modal (handle both Bootstrap versions)
            try {
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            } catch (error) {
                $('#userModal').modal('hide');
            }
            
            loadUsersContent(); // Refresh the users list
        } else {
            const error = await response.json();
            showNotification('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'), 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// Delete user with enhanced confirmation
async function deleteUser(userId) {
    const result = await showConfirmModal({
        title: 'ลบผู้ใช้',
        message: 'คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถยกเลิกได้',
        type: 'danger',
        confirmText: 'ลบผู้ใช้',
        cancelText: 'ยกเลิก'
    });
    
    if (!result) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            alert('ลบผู้ใช้เรียบร้อยแล้ว');
            loadUsersContent(); // Refresh the users list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถลบผู้ใช้ได้'));
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
}

// ==========================================
// ROOM CRUD OPERATIONS
// ==========================================

// Create new room
function createRoom() {
    showRoomModal();
}

// Show room modal for create/edit
function showRoomModal(room = null) {
    const isEdit = !!room;
    const modalHtml = `
        <div class="modal fade" id="roomModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="roomForm">
                            ${isEdit ? `<input type="hidden" id="roomId" value="${room.room_id}">` : ''}
                            <div class="mb-3">
                                <label for="roomName" class="form-label">ชื่อห้อง</label>
                                <input type="text" class="form-control" id="roomName" value="${room?.name || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="roomType" class="form-label">ประเภทห้อง</label>
                                <select class="form-control" id="roomType" required>
                                    <option value="1" ${room?.room_type_id == 1 ? 'selected' : ''}>ห้องเล็ก</option>
                                    <option value="2" ${room?.room_type_id == 2 ? 'selected' : ''}>ห้องกลาง</option>
                                    <option value="3" ${room?.room_type_id == 3 ? 'selected' : ''}>ห้องใหญ่</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="roomCapacity" class="form-label">ความจุ (คน)</label>
                                <input type="number" class="form-control" id="roomCapacity" value="${room?.capacity || ''}" min="1" max="50" required>
                            </div>
                            <div class="mb-3">
                                <label for="roomRate" class="form-label">ราคา/ชั่วโมง (บาท)</label>
                                <input type="number" class="form-control" id="roomRate" value="${room?.hourly_rate || ''}" min="0" step="0.01" required>
                            </div>
                            <div class="mb-3">
                                <label for="roomStatus" class="form-label">สถานะ</label>
                                <select class="form-control" id="roomStatus" required>
                                    <option value="available" ${room?.status === 'available' ? 'selected' : ''}>ว่าง</option>
                                    <option value="occupied" ${room?.status === 'occupied' ? 'selected' : ''}>ใช้งาน</option>
                                    <option value="maintenance" ${room?.status === 'maintenance' ? 'selected' : ''}>ปิดปรุง</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="button" class="btn btn-primary" onclick="saveRoom(${isEdit})">
                            ${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มห้อง'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('roomModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    try {
        const modal = new bootstrap.Modal(document.getElementById('roomModal'));
        modal.show();
    } catch (error) {
        $('#roomModal').modal('show');
    }
    
    // Remove modal after closing
    document.getElementById('roomModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Edit existing room
async function editRoom(roomId) {
    try {
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const roomData = await response.json();
            showRoomModal(roomData.room);
        } else {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง');
        }
    } catch (error) {
        console.error('Error loading room:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง');
    }
}

// Save room (create or update)
async function saveRoom(isEdit = false) {
    const roomId = document.getElementById('roomId')?.value;
    const name = document.getElementById('roomName').value;
    const room_type_id = document.getElementById('roomType').value;
    const capacity = document.getElementById('roomCapacity').value;
    const hourly_rate = document.getElementById('roomRate').value;
    const status = document.getElementById('roomStatus').value;
    
    if (!name || !room_type_id || !capacity || !hourly_rate || !status) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    const roomData = { name, room_type_id, capacity, hourly_rate, status };
    
    try {
        const url = isEdit ? `/api/admin/rooms/${roomId}` : '/api/admin/rooms';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(roomData)
        });
        
        if (response.ok) {
            alert(isEdit ? 'แก้ไขห้องเรียบร้อยแล้ว' : 'เพิ่มห้องเรียบร้อยแล้ว');
            
            // Close modal
            try {
                bootstrap.Modal.getInstance(document.getElementById('roomModal')).hide();
            } catch (error) {
                $('#roomModal').modal('hide');
            }
            
            loadRoomsContent(); // Refresh the rooms list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    } catch (error) {
        console.error('Error saving room:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// Delete room with enhanced confirmation
async function deleteRoom(roomId) {
    const result = await showConfirmModal({
        title: 'ลบห้อง',
        message: 'คุณแน่ใจหรือไม่ที่จะลบห้องนี้? การกระทำนี้ไม่สามารถยกเลิกได้',
        type: 'danger',
        confirmText: 'ลบห้อง',
        cancelText: 'ยกเลิก'
    });
    
    if (!result) return;
    
    try {
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            alert('ลบห้องเรียบร้อยแล้ว');
            loadRoomsContent(); // Refresh the rooms list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถลบห้องได้'));
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('เกิดข้อผิดพลาดในการลบห้อง');
    }
}

// ==========================================
// MENU CRUD OPERATIONS  
// ==========================================

// Create new menu item
function createMenuItem() {
    showMenuModal();
}

// Show menu modal for create/edit
function showMenuModal(menuItem = null) {
    const isEdit = !!menuItem;
    const modalHtml = `
        <div class="modal fade" id="menuModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'แก้ไขเมนู' : 'เพิ่มรายการอาหาร'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="menuForm">
                            ${isEdit ? `<input type="hidden" id="menuId" value="${menuItem.menu_id}">` : ''}
                            <div class="mb-3">
                                <label for="menuName" class="form-label">ชื่อรายการ</label>
                                <input type="text" class="form-control" id="menuName" value="${menuItem?.name || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="menuCategory" class="form-label">หมวดหมู่</label>
                                <select class="form-control" id="menuCategory" required>
                                    <option value="1" ${menuItem?.category_id == 1 ? 'selected' : ''}>เครื่องดื่ม</option>
                                    <option value="2" ${menuItem?.category_id == 2 ? 'selected' : ''}>อาหารว่าง</option>
                                    <option value="3" ${menuItem?.category_id == 3 ? 'selected' : ''}>อาหารหลัก</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="menuPrice" class="form-label">ราคา (บาท)</label>
                                <input type="number" class="form-control" id="menuPrice" value="${menuItem?.price || ''}" min="0" step="0.01" required>
                            </div>
                            <div class="mb-3">
                                <label for="menuAvailable" class="form-label">สถานะ</label>
                                <select class="form-control" id="menuAvailable" required>
                                    <option value="1" ${menuItem?.available ? 'selected' : ''}>พร้อมขาย</option>
                                    <option value="0" ${menuItem?.available === false ? 'selected' : ''}>หมด</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="button" class="btn btn-primary" onclick="saveMenuItem(${isEdit})">
                            ${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('menuModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    try {
        const modal = new bootstrap.Modal(document.getElementById('menuModal'));
        modal.show();
    } catch (error) {
        $('#menuModal').modal('show');
    }
    
    // Remove modal after closing
    document.getElementById('menuModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Edit existing menu item
async function editMenuItem(menuId) {
    try {
        const response = await fetch(`/api/admin/menu/${menuId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const menuData = await response.json();
            showMenuModal(menuData.item);
        } else {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลเมนู');
        }
    } catch (error) {
        console.error('Error loading menu item:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลเมนู');
    }
}

// Save menu item (create or update)
async function saveMenuItem(isEdit = false) {
    const menuId = document.getElementById('menuId')?.value;
    const name = document.getElementById('menuName').value;
    const category_id = document.getElementById('menuCategory').value;
    const price = document.getElementById('menuPrice').value;
    const available = document.getElementById('menuAvailable').value === '1';
    
    if (!name || !category_id || !price) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    const menuData = { name, category_id, price, available };
    
    try {
        const url = isEdit ? `/api/admin/menu/${menuId}` : '/api/admin/menu';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(menuData)
        });
        
        if (response.ok) {
            alert(isEdit ? 'แก้ไขเมนูเรียบร้อยแล้ว' : 'เพิ่มรายการเรียบร้อยแล้ว');
            
            // Close modal
            try {
                bootstrap.Modal.getInstance(document.getElementById('menuModal')).hide();
            } catch (error) {
                $('#menuModal').modal('hide');
            }
            
            loadMenuContent(); // Refresh the menu list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    } catch (error) {
        console.error('Error saving menu item:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// Delete menu item
async function deleteMenuItem(menuId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/menu/${menuId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            alert('ลบรายการเรียบร้อยแล้ว');
            loadMenuContent(); // Refresh the menu list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถลบรายการได้'));
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
}

// ==========================================
// BOOKING MANAGEMENT
// ==========================================

// Edit booking
function editBooking(bookingId) {
    console.log('Edit booking:', bookingId);
    alert(`แก้ไขการจอง ID: ${bookingId} (ยังไม่ได้ implement)`);
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            alert('ยกเลิกการจองเรียบร้อยแล้ว');
            loadBookingsContent(); // Refresh the bookings list
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถยกเลิกการจองได้'));
        }
    } catch (error) {
        console.error('Error canceling booking:', error);
        showNotification('เกิดข้อผิดพลาดในการยกเลิกการจอง', 'error');
    }
}

// Enhanced UI Functions
function showConfirmModal(options) {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="modal fade" id="confirmModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-${options.type === 'danger' ? 'danger' : 'primary'}">
                            <h5 class="modal-title text-white">
                                <i class="fas fa-${options.type === 'danger' ? 'exclamation-triangle' : 'question-circle'}"></i>
                                ${options.title}
                            </h5>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0">${options.message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                ${options.cancelText || 'ยกเลิก'}
                            </button>
                            <button type="button" class="btn btn-${options.type === 'danger' ? 'danger' : 'primary'}" id="confirmBtn">
                                <i class="fas fa-${options.type === 'danger' ? 'trash' : 'check'}"></i>
                                ${options.confirmText || 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('confirmModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        const confirmBtn = document.getElementById('confirmBtn');
        
        confirmBtn.addEventListener('click', () => {
            modal.hide();
            resolve(true);
        });
        
        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('confirmModal').remove();
            resolve(false);
        });
        
        modal.show();
    });
}

function showLoadingSpinner(container) {
    container.innerHTML = `
        <div class="loading-container text-center py-5">
            <div class="loading-spinner mx-auto mb-3"></div>
            <p class="text-muted">กำลังโหลดข้อมูล...</p>
        </div>
    `;
}

function showEmptyState(container, message, icon = 'inbox') {
    container.innerHTML = `
        <div class="empty-state text-center py-5">
            <i class="fas fa-${icon} mb-3" style="font-size: 4rem; color: var(--text-secondary);"></i>
            <h3 class="text-muted">ไม่มีข้อมูล</h3>
            <p class="text-muted">${message}</p>
        </div>
    `;
}