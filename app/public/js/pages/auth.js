/**
 * Auth Page Module
 * Page-specific functionality for /auth (login/register)
 */

import { $, $$, on, getFormData, clearForm } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { showToast, emit } from "../core/events.js";

/**
 * Initialize auth page
 * Called when auth page loads
 */
export function initAuthPage() {
    console.log('Initializing auth page...');
    
    setupTabSwitching();
    setupFormHandlers();
    setupPasswordToggle();
    setupPasswordStrength();
    
    // Auto-focus first input
    const firstInput = $('.auth-form.active input[type="email"]');
    if (firstInput) firstInput.focus();
}

/**
 * Setup tab switching between login and register
 */
function setupTabSwitching() {
    const tabs = $$('.auth-tab');
    const forms = $$('.auth-form-wrapper');
    
    tabs.forEach(tab => {
        on(tab, 'click', (e) => {
            const targetTab = e.target.dataset.tab;
            switchTab(targetTab);
        });
    });
    
    // Handle switch links
    const switchToRegister = $('#switch-to-register');
    const switchToLogin = $('#switch-to-login');
    
    if (switchToRegister) {
        on(switchToRegister, 'click', (e) => {
            e.preventDefault();
            switchTab('register');
        });
    }
    
    if (switchToLogin) {
        on(switchToLogin, 'click', (e) => {
            e.preventDefault();
            switchTab('login');
        });
    }
}

/**
 * Switch between login and register tabs
 * @param {string} tabName - Tab to switch to ('login' or 'register')
 */
function switchTab(tabName) {
    // Update tabs
    $$('.auth-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update forms
    $$('.auth-form-wrapper').forEach(wrapper => {
        if (wrapper.id === `${tabName}-form-container`) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    });
    
    // Update page title and subtitle
    const title = $('#auth-title');
    const subtitle = $('#auth-subtitle');
    
    if (tabName === 'register') {
        if (title) title.textContent = 'สมัครสมาชิก';
        if (subtitle) subtitle.textContent = 'สร้างบัญชีใหม่เพื่อเริ่มจองห้องคาราโอเกะ';
    } else {
        if (title) title.textContent = 'เข้าสู่ระบบ';
        if (subtitle) subtitle.textContent = 'เข้าสู่ระบบเพื่อจองห้องคาราโอเกะและจัดการการจองของคุณ';
    }
    
    // Clear any error messages
    clearErrorMessages();
    
    // Focus first input
    const activeForm = $(`.auth-form-wrapper.active`);
    const firstInput = activeForm?.querySelector('input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
}

/**
 * Setup form submit handlers
 */
function setupFormHandlers() {
    const loginForm = $('#login-form');
    const registerForm = $('#register-form');
    const forgotPasswordForm = $('#forgot-password-form');
    
    if (loginForm) {
        on(loginForm, 'submit', handleLogin);
    }
    
    if (registerForm) {
        on(registerForm, 'submit', handleRegister);
    }
    
    if (forgotPasswordForm) {
        on(forgotPasswordForm, 'submit', handleForgotPassword);
    }
    
    // Forgot password link
    const forgotLink = $('#forgot-password-link');
    if (forgotLink) {
        on(forgotLink, 'click', (e) => {
            e.preventDefault();
            showForgotPasswordModal();
        });
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = $('#login-submit-btn');
    const formData = getFormData(form);
    
    // Clear previous errors
    clearErrorMessages();
    
    // Validate form
    if (!validateLoginForm(formData)) {
        return;
    }
    
    // Show loading state
    setButtonLoading(submitBtn, true);
    
    try {
        const response = await apiPost('/auth/login', formData);
        
        if (response.success) {
            showToast('เข้าสู่ระบบสำเร็จ', 'success');
            
            // Store token if provided
            if (response.token) {
                localStorage.setItem('token', response.token);
            }
            
            // Emit login event
            emit('auth:login', response.user);
            
            // Redirect
            const redirectUrl = window.serverData?.redirectUrl || '/dashboard';
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        } else {
            showErrorMessage(response.message || 'เข้าสู่ระบบไม่สำเร็จ');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showErrorMessage(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = $('#register-submit-btn');
    const formData = getFormData(form);
    
    // Clear previous errors
    clearErrorMessages();
    
    // Validate form
    if (!validateRegisterForm(formData)) {
        return;
    }
    
    // Show loading state
    setButtonLoading(submitBtn, true);
    
    try {
        const response = await apiPost('/auth/register', formData);
        
        if (response.success) {
            showSuccessMessage('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            
            // Clear form
            clearForm(form);
            
            // Switch to login tab
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        } else {
            showErrorMessage(response.message || 'สมัครสมาชิกไม่สำเร็จ');
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showErrorMessage(error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle() {
    const toggles = $$('.password-toggle');
    
    toggles.forEach(toggle => {
        on(toggle, 'click', (e) => {
            e.preventDefault();
            
            const input = toggle.parentElement.querySelector('input');
            const icon = toggle.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

/**
 * Setup password strength indicator
 */
function setupPasswordStrength() {
    const passwordInput = $('#register-password');
    const strengthIndicator = $('#password-strength');
    
    if (!passwordInput || !strengthIndicator) return;
    
    on(passwordInput, 'input', (e) => {
        const password = e.target.value;
        const strength = calculatePasswordStrength(password);
        updatePasswordStrengthUI(strengthIndicator, strength);
    });
}

/**
 * Calculate password strength
 * @param {string} password - Password to check
 * @returns {Object} Strength score and level
 */
function calculatePasswordStrength(password) {
    let score = 0;
    let level = 'weak';
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score >= 5) level = 'strong';
    else if (score >= 3) level = 'medium';
    else if (score >= 1) level = 'weak';
    else level = 'very-weak';
    
    return { score, level };
}

/**
 * Update password strength UI
 * @param {Element} indicator - Strength indicator element
 * @param {Object} strength - Strength data
 */
function updatePasswordStrengthUI(indicator, strength) {
    const fill = indicator.querySelector('.strength-fill');
    const text = indicator.querySelector('.strength-text');
    
    const levelData = {
        'very-weak': { width: '20%', color: '#dc3545', text: 'รหัสผ่านอ่อนมาก' },
        'weak': { width: '40%', color: '#fd7e14', text: 'รหัสผ่านอ่อน' },
        'medium': { width: '70%', color: '#ffc107', text: 'รหัสผ่านปานกลาง' },
        'strong': { width: '100%', color: '#28a745', text: 'รหัสผ่านแข็งแกร่ง' }
    };
    
    const data = levelData[strength.level];
    
    if (fill && data) {
        fill.style.width = data.width;
        fill.style.backgroundColor = data.color;
    }
    
    if (text && data) {
        text.textContent = data.text;
        text.style.color = data.color;
    }
}

/**
 * Form validation functions
 */
function validateLoginForm(data) {
    let isValid = true;
    
    if (!data.email || !isValidEmail(data.email)) {
        showFieldError('login-email', 'กรุณากรอกอีเมลที่ถูกต้อง');
        isValid = false;
    }
    
    if (!data.password || data.password.length < 1) {
        showFieldError('login-password', 'กรุณากรอกรหัสผ่าน');
        isValid = false;
    }
    
    return isValid;
}

function validateRegisterForm(data) {
    let isValid = true;
    
    if (!data.firstname || data.firstname.trim().length < 1) {
        showFieldError('register-firstname', 'กรุณากรอกชื่อ');
        isValid = false;
    }
    
    if (!data.lastname || data.lastname.trim().length < 1) {
        showFieldError('register-lastname', 'กรุณากรอกนามสกุล');
        isValid = false;
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        showFieldError('register-email', 'กรุณากรอกอีเมลที่ถูกต้อง');
        isValid = false;
    }
    
    if (!data.phone || !isValidPhone(data.phone)) {
        showFieldError('register-phone', 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง');
        isValid = false;
    }
    
    if (!data.password || data.password.length < 6) {
        showFieldError('register-password', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        isValid = false;
    }
    
    if (data.password !== data.confirmPassword) {
        showFieldError('register-confirm-password', 'รหัสผ่านไม่ตรงกัน');
        isValid = false;
    }
    
    if (!data.terms) {
        showFieldError('register-terms', 'กรุณายอมรับข้อกำหนดการใช้งาน');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Utility functions
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[0-9]{9,10}$/.test(phone.replace(/[-\s]/g, ''));
}

function showFieldError(fieldId, message) {
    const errorElement = $(`#${fieldId}-error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearErrorMessages() {
    $$('.form-error').forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
    
    const alertError = $('#auth-error');
    if (alertError) alertError.style.display = 'none';
    
    const alertSuccess = $('#auth-success');
    if (alertSuccess) alertSuccess.style.display = 'none';
}

function showErrorMessage(message) {
    const alertError = $('#auth-error');
    const errorMessage = $('#auth-error-message');
    
    if (alertError && errorMessage) {
        errorMessage.textContent = message;
        alertError.style.display = 'block';
        
        // Scroll to error
        alertError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        showToast(message, 'error');
    }
}

function showSuccessMessage(message) {
    const alertSuccess = $('#auth-success');
    const successMessage = $('#auth-success-message');
    
    if (alertSuccess && successMessage) {
        successMessage.textContent = message;
        alertSuccess.style.display = 'block';
        
        // Scroll to success
        alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        showToast(message, 'success');
    }
}

function setButtonLoading(button, loading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (loading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline-flex';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

function showForgotPasswordModal() {
    const modal = $('#forgot-password-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Setup modal close handlers
        const closeBtn = $('#close-forgot-password-modal');
        const backdrop = $('#forgot-password-modal-backdrop');
        const cancelBtn = $('#forgot-password-cancel-btn');
        
        [closeBtn, backdrop, cancelBtn].forEach(element => {
            if (element) {
                on(element, 'click', () => {
                    modal.style.display = 'none';
                });
            }
        });
        
        // Focus email input
        const emailInput = $('#forgot-email');
        if (emailInput) emailInput.focus();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = $('#forgot-password-submit-btn');
    const formData = getFormData(form);
    
    // Clear previous errors
    const errorElement = $('#forgot-email-error');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    // Validate email
    if (!formData.email || !isValidEmail(formData.email)) {
        showFieldError('forgot-email', 'กรุณากรอกอีเมลที่ถูกต้อง');
        return;
    }
    
    // Show loading state
    setButtonLoading(submitBtn, true);
    
    try {
        const response = await apiPost('/auth/forgot-password', formData);
        
        if (response.success) {
            showToast('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล', 'success');
            
            // Close modal
            const modal = $('#forgot-password-modal');
            if (modal) modal.style.display = 'none';
            
            // Clear form
            clearForm(form);
        } else {
            showFieldError('forgot-email', response.message || 'ไม่สามารถส่งลิงก์รีเซ็ตได้');
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        showFieldError('forgot-email', error.message || 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ต');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Auto-initialize if we're on the auth page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.serverData?.currentPage === 'auth') {
            initAuthPage();
        }
    });
} else if (window.serverData?.currentPage === 'auth') {
    initAuthPage();
}