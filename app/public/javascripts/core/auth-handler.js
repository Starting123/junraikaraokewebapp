/**
 * ==========================================
 * GLOBAL AUTH HANDLER
 * ==========================================
 * 
 * จัดการ authentication errors และ redirects ทั่วทั้งแอปพลิเคชัน
 */

(function() {
    'use strict';

    // ตรวจสอบ token เมื่อโหลดหน้า
    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        // ถ้ามี token ให้เพิ่ม Bearer token ใน headers ทุก fetch request
        if (token) {
            // Override global fetch to automatically include auth header
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                // เพิ่ม Authorization header
                options.headers = options.headers || {};
                if (!options.headers['Authorization']) {
                    options.headers['Authorization'] = `Bearer ${token}`;
                }
                
                // Call original fetch
                return originalFetch(url, options)
                    .then(response => {
                        // ตรวจสอบ 401 Unauthorized
                        if (response.status === 401) {
                            handleUnauthorized();
                        }
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch error:', error);
                        throw error;
                    });
            };
        }

        // Update UI based on auth status
        updateAuthUI(token, user);
    }

    // จัดการ 401 Unauthorized
    function handleUnauthorized() {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Get current page for redirect
        const currentPath = window.location.pathname + window.location.search;
        
        // แสดง alert
        alert('⚠️ กรุณาเข้าสู่ระบบเพื่อเข้าถึงหน้านี้');
        
        // Redirect to login with return URL
        window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}&message=${encodeURIComponent('กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ')}`;
    }

    // อัพเดท UI ตาม auth status
    function updateAuthUI(token, userJson) {
        const authLink = document.getElementById('authLink');
        const logoutBtn = document.getElementById('logoutBtn');
        const bookingsLink = document.getElementById('bookingsLink');
        
        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                
                // Show authenticated elements
                if (authLink) {
                    authLink.textContent = `👤 ${user.name}`;
                    authLink.href = '/auth/profile';
                }
                
                if (logoutBtn) {
                    logoutBtn.style.display = 'inline-block';
                }
                
                if (bookingsLink) {
                    bookingsLink.style.display = 'inline-block';
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        } else {
            // Show guest elements
            if (authLink) {
                authLink.textContent = 'เข้าสู่ระบบ';
                authLink.href = '/auth/login';
            }
            
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            if (bookingsLink) {
                bookingsLink.style.display = 'none';
            }
        }
    }

    // Logout function (global)
    window.logout = function() {
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            const token = localStorage.getItem('token');
            
            // Call logout API
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .finally(() => {
                // Clear local storage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Redirect to home
                window.location.href = '/';
            });
        }
    };

    // Global error handler for fetch
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Check if it's an auth error
        if (event.reason && event.reason.status === 401) {
            handleUnauthorized();
        }
    });

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', checkAuth);

    // Export for use in other scripts
    window.authHandler = {
        checkAuth,
        handleUnauthorized,
        updateAuthUI
    };

})();
