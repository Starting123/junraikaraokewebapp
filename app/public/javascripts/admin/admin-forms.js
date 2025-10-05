// ==========================================
// ENHANCED FORM VALIDATION SYSTEM
// ==========================================

class FormValidator {
    constructor() {
        this.validators = new Map();
        this.initializeValidationSystem();
    }

    initializeValidationSystem() {
        // Initialize form validation for all forms
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormValidation();
        });

        // Handle dynamic form creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.querySelector && node.querySelector('form')) {
                        this.setupFormValidation(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupFormValidation(container = document) {
        const forms = container.querySelectorAll('form');
        forms.forEach(form => this.initializeForm(form));
    }

    initializeForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Password confirmation handling
            if (input.name === 'confirmPassword') {
                const passwordField = form.querySelector('input[name="password"]');
                if (passwordField) {
                    passwordField.addEventListener('input', () => this.validatePasswordMatch(input));
                }
            }
        });

        // Form submission validation
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        const fieldType = field.type;
        const isRequired = field.hasAttribute('required');

        // Clear previous errors
        this.clearFieldError(field);

        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'กรุณากรอกข้อมูลในช่องนี้';
        }
        // Email validation
        else if (fieldType === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
            }
        }
        // Password validation
        else if (fieldType === 'password' && value) {
            if (value.length < 6) {
                isValid = false;
                errorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
            }
        }
        // Confirm password validation
        else if (fieldName === 'confirmPassword' && value) {
            const passwordField = field.form.querySelector('input[name="password"]');
            if (passwordField && value !== passwordField.value) {
                isValid = false;
                errorMessage = 'รหัสผ่านไม่ตรงกัน';
            }
        }
        // Number validation
        else if (fieldType === 'number' && value) {
            const min = field.getAttribute('min');
            const max = field.getAttribute('max');
            const numValue = parseFloat(value);
            
            if (isNaN(numValue)) {
                isValid = false;
                errorMessage = 'กรุณากรอกตัวเลขที่ถูกต้อง';
            } else if (min && numValue < parseFloat(min)) {
                isValid = false;
                errorMessage = `ค่าต้องไม่น้อยกว่า ${min}`;
            } else if (max && numValue > parseFloat(max)) {
                isValid = false;
                errorMessage = `ค่าต้องไม่เกิน ${max}`;
            }
        }
        // Text length validation
        else if ((fieldType === 'text' || fieldType === 'textarea') && value) {
            const minLength = field.getAttribute('minlength');
            const maxLength = field.getAttribute('maxlength');
            
            if (minLength && value.length < parseInt(minLength)) {
                isValid = false;
                errorMessage = `ต้องมีอย่างน้อย ${minLength} ตัวอักษร`;
            } else if (maxLength && value.length > parseInt(maxLength)) {
                isValid = false;
                errorMessage = `ต้องไม่เกิน ${maxLength} ตัวอักษร`;
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.showFieldSuccess(field);
        }

        return isValid;
    }

    validatePasswordMatch(confirmField) {
        const passwordField = confirmField.form.querySelector('input[name="password"]');
        if (passwordField && confirmField.value && confirmField.value !== passwordField.value) {
            this.showFieldError(confirmField, 'รหัสผ่านไม่ตรงกัน');
            return false;
        } else if (confirmField.value && passwordField && confirmField.value === passwordField.value) {
            this.showFieldSuccess(confirmField);
            return true;
        }
        return true;
    }

    validateForm(form) {
        const fields = form.querySelectorAll('input, textarea, select');
        let isFormValid = true;
        let firstInvalidField = null;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isFormValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            }
        });

        // Focus first invalid field
        if (firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }

        return isFormValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        field.classList.remove('success');
        
        // Remove existing error message
        this.removeFieldMessage(field);
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Insert after field or field group
        const formGroup = field.closest('.form-group') || field.parentNode;
        formGroup.appendChild(errorDiv);
    }

    showFieldSuccess(field) {
        field.classList.add('success');
        field.classList.remove('error');
        this.removeFieldMessage(field);
    }

    clearFieldError(field) {
        field.classList.remove('error', 'success');
        this.removeFieldMessage(field);
    }

    removeFieldMessage(field) {
        const formGroup = field.closest('.form-group') || field.parentNode;
        const existingMessage = formGroup.querySelector('.field-error, .field-success');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // === CUSTOM VALIDATORS ===
    addCustomValidator(fieldName, validator) {
        this.validators.set(fieldName, validator);
    }

    // Thai ID validation
    validateThaiID(idNumber) {
        if (!/^\d{13}$/.test(idNumber)) return false;
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(idNumber.charAt(i)) * (13 - i);
        }
        
        const remainder = sum % 11;
        const checkDigit = remainder < 2 ? (11 - remainder) % 10 : (11 - remainder) % 10;
        
        return checkDigit === parseInt(idNumber.charAt(12));
    }

    // Thai phone number validation
    validateThaiPhone(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        return /^(08|09|06|02)\d{8}$/.test(cleaned) || /^(\+66|66)(8|9|6|2)\d{8}$/.test(cleaned);
    }

    // Credit card validation (Luhn algorithm)
    validateCreditCard(cardNumber) {
        const cleaned = cardNumber.replace(/\D/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;
        
        let sum = 0;
        let isEven = false;
        
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }
}

// ==========================================
// ADVANCED FORM UTILITIES
// ==========================================

class FormUtils {
    static formatCurrency(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d.]/g, '');
            const parts = value.split('.');
            
            if (parts.length > 2) {
                value = parts[0] + '.' + parts[1];
            }
            
            if (parts[1] && parts[1].length > 2) {
                value = parts[0] + '.' + parts[1].substring(0, 2);
            }
            
            e.target.value = value;
        });
    }

    static formatPhoneNumber(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Format as XXX-XXX-XXXX
            if (value.length >= 6) {
                value = value.substring(0, 3) + '-' + value.substring(3, 6) + '-' + value.substring(6, 10);
            } else if (value.length >= 3) {
                value = value.substring(0, 3) + '-' + value.substring(3);
            }
            
            e.target.value = value;
        });
    }

    static limitTextLength(input, maxLength) {
        input.addEventListener('input', (e) => {
            if (e.target.value.length > maxLength) {
                e.target.value = e.target.value.substring(0, maxLength);
            }
        });
    }

    static uppercaseInput(input) {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    static numbersOnly(input) {
        input.addEventListener('keypress', (e) => {
            if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    static preventSpaces(input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === ' ') {
                e.preventDefault();
            }
        });
    }
}

// ==========================================
// FORM AUTO-SAVE FUNCTIONALITY
// ==========================================

class FormAutoSave {
    constructor(formId, options = {}) {
        this.form = document.getElementById(formId);
        this.storageKey = `autosave_${formId}`;
        this.saveInterval = options.saveInterval || 5000; // 5 seconds
        this.excludeFields = options.excludeFields || ['password', 'confirmPassword'];
        
        if (this.form) {
            this.initializeAutoSave();
        }
    }

    initializeAutoSave() {
        // Load saved data
        this.loadSavedData();
        
        // Setup auto-save
        const inputs = this.form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!this.excludeFields.includes(input.name)) {
                input.addEventListener('input', () => this.scheduleAutoSave());
            }
        });

        // Clear saved data on successful submission
        this.form.addEventListener('submit', () => {
            setTimeout(() => this.clearSavedData(), 100);
        });
    }

    scheduleAutoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveFormData();
        }, this.saveInterval);
    }

    saveFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (!this.excludeFields.includes(key)) {
                data[key] = value;
            }
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    loadSavedData() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const field = this.form.querySelector(`[name="${key}"]`);
                    if (field && field.type !== 'file') {
                        field.value = data[key];
                    }
                });
            } catch (error) {
                console.error('Error loading auto-saved data:', error);
            }
        }
    }

    clearSavedData() {
        localStorage.removeItem(this.storageKey);
    }
}

// Initialize Form Validation System
window.FormValidator = new FormValidator();
window.FormUtils = FormUtils;
window.FormAutoSave = FormAutoSave;