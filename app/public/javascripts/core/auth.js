/**
 * ================================================================
 * JUNRAI KARAOKE - AUTHENTICATION MODULE
 * Modern authentication with enhanced security and UX
 * ================================================================
 */

class JunraiAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.refreshToken = null;
        this.authCheckInterval = null;
        this.tokenRefreshTimeout = null;
        
        this.initialize();
    }

    /**
     * Initialize authentication system
     */
    initialize() {
        this.loadStoredAuth();
        this.setupAuthCheck();
        this.setupTokenRefresh();
        this.updateUI();
        
        // Listen for storage changes (multi-tab logout)
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    /**
     * Load authentication data from storage
     */
    loadStoredAuth() {
        this.authToken = JunraiUtils.getLocalStorage('junrai_auth_token');
        this.refreshToken = JunraiUtils.getLocalStorage('junrai_refresh_token');
        this.currentUser = JunraiUtils.getLocalStorage('junrai_user_data');
        
        // Validate stored data
        if (this.authToken && !this.currentUser) {
            this.clearAuth();
        }
    }

    /**
     * Authenticate user with credentials
     */
    async login(credentials) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (response.success) {
                await this.setAuthData(response.data);
                JunraiUtils.emit(document, 'junrai:auth:login', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.message || 'การเข้าสู่ระบบล้มเหลว');
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Authentication login');
            return { 
                success: false, 
                message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
            };
        }
    }

    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                await this.setAuthData(response.data);
                JunraiUtils.emit(document, 'junrai:auth:register', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.message || 'การสมัครสมาชิกล้มเหลว');
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Authentication register');
            return { 
                success: false, 
                message: error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' 
            };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            // Notify server about logout
            if (this.authToken) {
                await JunraiUtils.apiRequest('/api/auth/logout', {
                    method: 'POST'
                }).catch(() => {
                    // Ignore server errors on logout
                });
            }
        } catch (error) {
            // Ignore logout errors
        } finally {
            this.clearAuth();
            JunraiUtils.emit(document, 'junrai:auth:logout');
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshAuthToken() {
        if (!this.refreshToken) {
            this.clearAuth();
            return false;
        }

        try {
            const response = await JunraiUtils.apiRequest('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ 
                    refreshToken: this.refreshToken 
                })
            });

            if (response.success) {
                await this.setAuthData(response.data);
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Token refresh');
            this.clearAuth();
            return false;
        }
    }

    /**
     * Verify current authentication status
     */
    async verifyAuth() {
        if (!this.authToken) {
            return false;
        }

        try {
            const response = await JunraiUtils.apiRequest('/api/auth/verify');
            
            if (response.success) {
                // Update user data if provided
                if (response.user) {
                    this.currentUser = response.user;
                    JunraiUtils.setLocalStorage('junrai_user_data', this.currentUser);
                }
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Auth verification');
            this.clearAuth();
            return false;
        }
    }

    /**
     * Forgot password request
     */
    async forgotPassword(email) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            return {
                success: response.success,
                message: response.message || (response.success ? 
                    'ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณแล้ว' : 
                    'เกิดข้อผิดพลาดในการส่งอีเมล')
            };
        } catch (error) {
            JunraiUtils.logError(error, 'Forgot password');
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน'
            };
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ 
                    token, 
                    newPassword 
                })
            });

            return {
                success: response.success,
                message: response.message || (response.success ? 
                    'รหัสผ่านถูกเปลี่ยนเรียบร้อยแล้ว' : 
                    'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
            };
        } catch (error) {
            JunraiUtils.logError(error, 'Reset password');
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
            };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.user };
                JunraiUtils.setLocalStorage('junrai_user_data', this.currentUser);
                JunraiUtils.emit(document, 'junrai:auth:profile-updated', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.message || 'การอัปเดตข้อมูลล้มเหลว');
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Profile update');
            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
            };
        }
    }

    /**
     * Change user password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await JunraiUtils.apiRequest('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            return {
                success: response.success,
                message: response.message || (response.success ?
                    'รหัสผ่านถูกเปลี่ยนเรียบร้อยแล้ว' :
                    'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
            };
        } catch (error) {
            JunraiUtils.logError(error, 'Change password');
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
            };
        }
    }

    /**
     * Set authentication data
     */
    async setAuthData(authData) {
        this.authToken = authData.token;
        this.refreshToken = authData.refreshToken;
        this.currentUser = authData.user;

        // Store in localStorage
        JunraiUtils.setLocalStorage('junrai_auth_token', this.authToken);
        JunraiUtils.setLocalStorage('junrai_refresh_token', this.refreshToken);
        JunraiUtils.setLocalStorage('junrai_user_data', this.currentUser);

        // Update UI
        this.updateUI();

        // Setup token refresh
        this.setupTokenRefresh();
    }

    /**
     * Clear authentication data
     */
    clearAuth() {
        this.currentUser = null;
        this.authToken = null;
        this.refreshToken = null;

        // Clear storage
        JunraiUtils.removeLocalStorage('junrai_auth_token');
        JunraiUtils.removeLocalStorage('junrai_refresh_token');
        JunraiUtils.removeLocalStorage('junrai_user_data');

        // Clear intervals and timeouts
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }

        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout);
            this.tokenRefreshTimeout = null;
        }

        // Update UI
        this.updateUI();
    }

    /**
     * Setup periodic authentication check
     */
    setupAuthCheck() {
        // Check auth every 5 minutes
        this.authCheckInterval = setInterval(() => {
            if (this.isAuthenticated()) {
                this.verifyAuth();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout);
        }

        if (this.authToken) {
            // Refresh token 5 minutes before expiry
            const refreshTime = 55 * 60 * 1000; // 55 minutes
            this.tokenRefreshTimeout = setTimeout(() => {
                this.refreshAuthToken();
            }, refreshTime);
        }
    }

    /**
     * Handle storage changes (multi-tab support)
     */
    handleStorageChange(e) {
        if (e.key === 'junrai_auth_token' || e.key === 'junrai_user_data') {
            this.loadStoredAuth();
            this.updateUI();
            
            if (!this.isAuthenticated()) {
                JunraiUtils.emit(document, 'junrai:auth:logout');
            }
        }
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (!document.hidden && this.isAuthenticated()) {
            // Verify auth when page becomes visible
            this.verifyAuth();
        }
    }

    /**
     * Update UI based on authentication status
     */
    updateUI() {
        const isAuth = this.isAuthenticated();
        const isAdmin = this.isAdmin();

        // Update navigation elements
        this.updateNavigation(isAuth, isAdmin);
        
        // Update user-specific elements
        this.updateUserElements(isAuth);
        
        // Update admin-specific elements
        this.updateAdminElements(isAdmin);

        // Emit UI update event
        JunraiUtils.emit(document, 'junrai:auth:ui-updated', {
            isAuthenticated: isAuth,
            isAdmin: isAdmin,
            user: this.currentUser
        });
    }

    /**
     * Update navigation elements
     */
    updateNavigation(isAuth, isAdmin) {
        // Auth-related links
        const authLinks = JunraiUtils.findElements('[data-auth-required]');
        const guestLinks = JunraiUtils.findElements('[data-guest-only]');
        const adminLinks = JunraiUtils.findElements('[data-admin-required]');

        authLinks.forEach(link => {
            link.style.display = isAuth ? '' : 'none';
        });

        guestLinks.forEach(link => {
            link.style.display = isAuth ? 'none' : '';
        });

        adminLinks.forEach(link => {
            link.style.display = isAdmin ? '' : 'none';
        });

        // User dropdown toggle
        const userMenuToggle = JunraiUtils.findElement('#userMenuToggle');
        if (userMenuToggle && this.currentUser) {
            const userName = userMenuToggle.querySelector('span');
            if (userName) {
                userName.textContent = this.currentUser.firstName || this.currentUser.username || 'ผู้ใช้';
            }
        }

        // User avatar
        const userAvatar = JunraiUtils.findElement('.user-avatar');
        if (userAvatar && this.currentUser) {
            const initial = (this.currentUser.firstName || this.currentUser.username || 'U').charAt(0).toUpperCase();
            userAvatar.textContent = initial;
            userAvatar.title = this.currentUser.firstName || this.currentUser.username || 'ผู้ใช้';
        }
    }

    /**
     * Update user-specific elements
     */
    updateUserElements(isAuth) {
        if (!isAuth) return;

        // User profile displays
        const userNameElements = JunraiUtils.findElements('[data-user-name]');
        const userEmailElements = JunraiUtils.findElements('[data-user-email]');
        const userRoleElements = JunraiUtils.findElements('[data-user-role]');

        userNameElements.forEach(el => {
            el.textContent = this.currentUser?.firstName || this.currentUser?.username || '';
        });

        userEmailElements.forEach(el => {
            el.textContent = this.currentUser?.email || '';
        });

        userRoleElements.forEach(el => {
            el.textContent = this.getRoleDisplayName(this.currentUser?.role_id);
        });
    }

    /**
     * Update admin-specific elements
     */
    updateAdminElements(isAdmin) {
        const adminElements = JunraiUtils.findElements('[data-admin-only]');
        adminElements.forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    }

    /**
     * Utility methods
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role_id === 1;
    }

    getUser() {
        return this.currentUser;
    }

    getToken() {
        return this.authToken;
    }

    getUserId() {
        return this.currentUser?.id || null;
    }

    getUserRole() {
        return this.currentUser?.role_id || null;
    }

    getRoleDisplayName(roleId) {
        const roles = {
            1: 'ผู้ดูแลระบบ',
            2: 'พนักงาน',
            3: 'สมาชิก'
        };
        return roles[roleId] || 'ผู้ใช้';
    }

    /**
     * Route protection
     */
    requireAuth(redirectUrl = '/auth') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    requireAdmin(redirectUrl = '/') {
        if (!this.isAdmin()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    requireGuest(redirectUrl = '/dashboard') {
        if (this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
}

// Initialize authentication
const junraiAuth = new JunraiAuth();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiAuth;
}

// Make available globally
window.JunraiAuth = JunraiAuth;
window.junraiAuth = junraiAuth;