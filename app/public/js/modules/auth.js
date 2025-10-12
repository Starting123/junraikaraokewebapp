/**
 * Authentication Module
 * Handles login, logout, registration, and auth state management
 */

class AuthModule {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // Load stored auth data
        this.loadStoredAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        this.initialized = true;
    }

    /**
     * Load authentication data from localStorage
     */
    loadStoredAuth() {
        this.token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
            } catch (e) {
                console.warn('Invalid user data in localStorage');
                localStorage.removeItem('user');
            }
        }

        // Update API token
        if (window.API && this.token) {
            window.API.setToken(this.token);
        }
    }

    /**
     * Setup event listeners for auth-related events
     */
    setupEventListeners() {
        // Listen for auth form submissions
        window.EventBus.on('form:submit', (event) => {
            const { module, action, form, originalEvent } = event.data;
            
            if (module === 'auth') {
                originalEvent.preventDefault();
                
                if (action === 'login') {
                    this.handleLogin(form);
                } else if (action === 'register') {
                    this.handleRegister(form);
                }
            }
        });

        // Listen for auth actions
        window.EventBus.on('ui:action', (event) => {
            const { action, element, data } = event.data;
            
            switch (action) {
                case 'logout':
                    event.originalEvent.preventDefault();
                    this.handleLogout();
                    break;
                case 'show-login':
                    this.showLoginForm();
                    break;
                case 'show-register':
                    this.showRegisterForm();
                    break;
                case 'toggle-password':
                    this.togglePasswordVisibility(data.target);
                    break;
            }
        });

        // Listen for auth errors from API
        window.EventBus.on('auth:error', (event) => {
            this.handleAuthError(event.data);
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin(form) {
        const formData = window.DOM.getFormData(form);
        const { email, password } = formData;

        if (!email || !password) {
            this.showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await window.API.post('/auth/login', { email, password });
            
            // Store auth data
            this.setAuthData(response.user, response.token);
            
            this.showMessage(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${response.user.name}`, 'success');
            
            // Redirect after success
            setTimeout(() => {
                const redirectUrl = this.getRedirectUrl() || (response.user.role_id === 1 ? '/admin' : '/dashboard');
                window.location.href = redirectUrl;
            }, 1500);
            
        } catch (error) {
            this.showMessage(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(form) {
        const formData = window.DOM.getFormData(form);
        const { name, email, password, confirmPassword } = formData;

        // Client-side validation
        if (!name || !email || !password || !confirmPassword) {
            this.showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }

        if (password.length < 12) {
            this.showMessage('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('รหัสผ่านไม่ตรงกัน', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await window.API.post('/auth/register', { name, email, password });
            
            this.showMessage('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ', 'success');
            
            // Switch to login form and pre-fill email
            setTimeout(() => {
                this.showLoginForm();
                const emailInput = window.DOM.$('#loginEmail');
                if (emailInput) {
                    emailInput.value = email;
                }
            }, 2000);
            
        } catch (error) {
            let message = error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
            
            // Handle validation errors
            if (error.data && error.data.errors) {
                message = error.data.errors.map(err => err.msg).join(', ');
            }
            
            this.showMessage(message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await window.API.logout();
        } catch (error) {
            // API.logout() already handles cleanup and redirect
            console.warn('Logout error:', error);
        }
    }

    /**
     * Set authentication data
     */
    setAuthData(user, token) {
        this.currentUser = user;
        this.token = token;
        
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        
        // Update API instance
        if (window.API) {
            window.API.setToken(token);
        }
        
        // Update UI
        this.updateAuthUI();
        
        // Emit auth event
        window.EventBus.emit('auth:login', { user, token });
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        this.currentUser = null;
        this.token = null;
        
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        if (window.API) {
            window.API.setToken(null);
        }
        
        this.updateAuthUI();
        
        window.EventBus.emit('auth:logout');
    }

    /**
     * Update auth-related UI elements
     */
    updateAuthUI() {
        const authLink = window.DOM.$('#authLink');
        const logoutBtn = window.DOM.$('#logoutBtn');
        const dashboardLink = window.DOM.$('#dashboardLink');
        const adminLink = window.DOM.$('#adminLink');
        const heroBookingBtn = window.DOM.$('#heroBookingBtn');

        if (this.isAuthenticated()) {
            // User is logged in
            window.DOM.hide(authLink);
            window.DOM.show(logoutBtn, 'inline-block');
            window.DOM.show(dashboardLink, 'inline-block');
            
            if (heroBookingBtn) {
                window.DOM.show(heroBookingBtn, 'inline-flex');
            }
            
            // Show admin link for admins
            if (this.isAdmin()) {
                window.DOM.show(adminLink, 'inline-block');
            } else {
                window.DOM.hide(adminLink);
            }
        } else {
            // User is not logged in
            window.DOM.show(authLink, 'inline-block');
            window.DOM.hide(logoutBtn);
            window.DOM.hide(dashboardLink);
            window.DOM.hide(adminLink);
            
            if (heroBookingBtn) {
                window.DOM.hide(heroBookingBtn);
            }
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.token || !this.currentUser) return false;
        
        try {
            // Check if token is expired
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp > now;
        } catch (e) {
            // Invalid token
            this.clearAuthData();
            return false;
        }
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role_id === 1;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Show/hide login form
     */
    showLoginForm() {
        const loginCard = window.DOM.$('#loginCard');
        const registerCard = window.DOM.$('#registerCard');
        
        if (loginCard) window.DOM.show(loginCard, 'block');
        if (registerCard) window.DOM.hide(registerCard);
        
        this.clearMessages();
    }

    /**
     * Show/hide register form
     */
    showRegisterForm() {
        const loginCard = window.DOM.$('#loginCard');
        const registerCard = window.DOM.$('#registerCard');
        
        if (loginCard) window.DOM.hide(loginCard);
        if (registerCard) window.DOM.show(registerCard, 'block');
        
        this.clearMessages();
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(targetId) {
        const input = window.DOM.$(targetId);
        if (!input) return;
        
        const button = input.parentNode.querySelector('.password-toggle');
        const icon = button ? button.querySelector('i') : null;
        
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.className = 'fas fa-eye-slash';
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.className = 'fas fa-eye';
            }
        }
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
     * Show message in auth forms
     */
    showMessage(message, type = 'info') {
        // Try to show in form-specific result areas first
        const loginResult = window.DOM.$('#loginResult');
        const registerResult = window.DOM.$('#registerResult');
        
        let targetElement = null;
        if (loginResult && window.DOM.$(loginResult).style.display !== 'none') {
            targetElement = loginResult;
        } else if (registerResult && window.DOM.$(registerResult).style.display !== 'none') {
            targetElement = registerResult;
        }
        
        if (targetElement) {
            const iconClass = this.getIconClass(type);
            targetElement.innerHTML = `
                <div class="alert alert-${type}">
                    <i class="${iconClass}"></i>
                    ${message}
                </div>
            `;
        } else {
            // Fallback to toast
            window.EventBus.emit('toast:show', { message, type });
        }
    }

    /**
     * Clear result messages
     */
    clearMessages() {
        const loginResult = window.DOM.$('#loginResult');
        const registerResult = window.DOM.$('#registerResult');
        
        if (loginResult) loginResult.innerHTML = '';
        if (registerResult) registerResult.innerHTML = '';
    }

    /**
     * Get icon class for message type
     */
    getIconClass(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get redirect URL from query params
     */
    getRedirectUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('redirect');
    }

    /**
     * Handle auth errors
     */
    handleAuthError(error) {
        if (error.status === 401) {
            this.clearAuthData();
        }
    }

    /**
     * Require authentication for page access
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
            return false;
        }
        return true;
    }

    /**
     * Require admin access for page access
     */
    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = '/auth';
            return false;
        }
        
        if (!this.isAdmin()) {
            window.location.href = '/dashboard';
            return false;
        }
        
        return true;
    }
}

// Create global instance
window.Auth = new AuthModule();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthModule;
}