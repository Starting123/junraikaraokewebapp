// ==========================================
// ADMIN DASHBOARD - MAIN CONTROLLER
// ==========================================

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.isAuthenticated = false;
        this.user = null;
        this.init();
    }

    async init() {
        console.log('🚀 Admin Dashboard initializing...');
        
        // Check authentication first
        await this.checkAuth();
        
        if (this.isAuthenticated) {
            this.setupNavigation();
            this.setupEventListeners();
            this.loadDashboardStats();
            this.showSection('dashboard');
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.redirectToAuth();
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user.role_id === 1) {
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.updateUserInfo();
                } else {
                    this.redirectToAuth('ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล');
                }
            } else {
                this.redirectToAuth();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToAuth();
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('[data-section]').dataset.section;
                this.showSection(section);
            });
        });
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('adminNavToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
            this.updateActiveNav(sectionName);
            this.updateBreadcrumb(sectionName);
            this.loadSectionContent(sectionName);
        }

        // Update URL
        window.location.hash = sectionName;
    }

    updateBreadcrumb(sectionName) {
        const breadcrumbMap = {
            'dashboard': 'แดชบอร์ด',
            'users': 'จัดการผู้ใช้',
            'rooms': 'จัดการห้อง',
            'menu': 'จัดการเมนู',
            'bookings': 'การจอง',
            'reports': 'รายงาน'
        };
        
        const currentSectionEl = document.getElementById('currentSection');
        if (currentSectionEl && breadcrumbMap[sectionName]) {
            currentSectionEl.textContent = breadcrumbMap[sectionName];
        }
    }

    updateActiveNav(sectionName) {
        document.querySelectorAll('[data-section]').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });
    }

    async loadSectionContent(sectionName) {
        switch (sectionName) {
            case 'users':
                if (window.AdminCRUD) {
                    await window.AdminCRUD.loadUsers();
                }
                break;
            case 'rooms':
                if (window.AdminCRUD) {
                    await window.AdminCRUD.loadRooms();
                }
                break;
            case 'menu':
                if (window.AdminCRUD) {
                    await window.AdminCRUD.loadMenu();
                }
                break;
            case 'bookings':
                if (window.AdminCRUD) {
                    await window.AdminCRUD.loadBookings();
                }
                break;
            case 'reports':
                if (window.AdminStats) {
                    await window.AdminStats.loadReports();
                }
                break;
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            totalRooms: document.getElementById('totalRooms'),
            totalBookings: document.getElementById('totalBookings'),
            totalRevenue: document.getElementById('totalRevenue')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && stats[key] !== undefined) {
                elements[key].textContent = this.formatStatValue(key, stats[key]);
            }
        });
    }

    formatStatValue(key, value) {
        if (key === 'totalRevenue') {
            return `฿${Number(value).toLocaleString()}`;
        }
        return Number(value).toLocaleString();
    }

    updateUserInfo() {
        const userName = document.getElementById('userName');
        if (userName && this.user) {
            userName.textContent = this.user.name;
        }
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
        }
    }

    logout() {
        if (confirm('ต้องการออกจากระบบหรือไม่?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
        }
    }

    redirectToAuth(message = null) {
        if (message) alert(message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});