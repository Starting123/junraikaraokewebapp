/**
 * ================================================================
 * JUNRAI KARAOKE - FORM VALIDATION MODULE
 * Advanced form validation with real-time feedback and UX enhancements
 * ================================================================
 */

class JunraiFormValidator {
    constructor() {
        this.forms = new Map();
        this.validationRules = new Map();
        this.customValidators = new Map();
        this.i18n = {
            th: {
                required: 'กรุณากรอกข้อมูลในช่องนี้',
                email: 'กรุณากรอกอีเมลให้ถูกต้อง',
                phone: 'กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง',
                minLength: 'ข้อมูลต้องมีความยาวอย่างน้อย {min} ตัวอักษร',
                maxLength: 'ข้อมูลต้องมีความยาวไม่เกิน {max} ตัวอักษร',
                min: 'ค่าต้องมากกว่าหรือเท่ากับ {min}',
                max: 'ค่าต้องน้อยกว่าหรือเท่ากับ {max}',
                pattern: 'รูปแบบข้อมูลไม่ถูกต้อง',
                match: 'ข้อมูลไม่ตรงกัน',
                unique: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
                strongPassword: 'รหัสผ่านต้องมีความแข็งแรงมากกว่านี้',
                thaiId: 'หมายเลขบัตรประจำตัวประชาชนไม่ถูกต้อง',
                thaiPostalCode: 'รหัสไปรษณีย์ไม่ถูกต้อง',
                creditCard: 'หมายเลขบัตรเครดิตไม่ถูกต้อง',
                future: 'วันที่ต้องเป็นอนาคต',
                past: 'วันที่ต้องเป็นอดีต',
                businessHours: 'เวลาต้องอยู่ในช่วงเวลาทำการ',
                age: 'อายุต้องมากกว่าหรือเท่ากับ {min} ปี'
            }
        };
        
        this.init();
    }

    /**
     * Initialize form validation system
     */
    init() {
        this.setupDefaultValidators();
        this.bindGlobalEvents();
        this.scanForForms();
        this.setupRealTimeValidation();
    }

    /**
     * Setup default validation rules
     */
    setupDefaultValidators() {
        // Email validator
        this.addValidator('email', (value) => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(value);
        });

        // Thai phone number validator
        this.addValidator('phone', (value) => {
            const cleaned = value.replace(/\D/g, '');
            return cleaned.length >= 9 && cleaned.length <= 15 && /^[0-9]+$/.test(cleaned);
        });

        // Strong password validator
        this.addValidator('strongPassword', (value) => {
            if (value.length < 8) return false;
            
            const hasLower = /[a-z]/.test(value);
            const hasUpper = /[A-Z]/.test(value);
            const hasNumber = /\d/.test(value);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
            
            return [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length >= 3;
        });

        // Thai ID number validator
        this.addValidator('thaiId', (value) => {
            const cleaned = value.replace(/\D/g, '');
            if (cleaned.length !== 13) return false;
            
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(cleaned[i]) * (13 - i);
            }
            
            const checksum = (11 - (sum % 11)) % 10;
            return checksum === parseInt(cleaned[12]);
        });

        // Thai postal code validator
        this.addValidator('thaiPostalCode', (value) => {
            const cleaned = value.replace(/\D/g, '');
            return cleaned.length === 5 && /^[0-9]{5}$/.test(cleaned);
        });

        // Credit card validator (Luhn algorithm)
        this.addValidator('creditCard', (value) => {
            const cleaned = value.replace(/\D/g, '');
            if (cleaned.length < 13 || cleaned.length > 19) return false;
            
            let sum = 0;
            let alternate = false;
            
            for (let i = cleaned.length - 1; i >= 0; i--) {
                let n = parseInt(cleaned[i]);
                
                if (alternate) {
                    n *= 2;
                    if (n > 9) n -= 9;
                }
                
                sum += n;
                alternate = !alternate;
            }
            
            return sum % 10 === 0;
        });

        // Future date validator
        this.addValidator('future', (value, field, options) => {
            const inputDate = new Date(value);
            const minDate = options.from ? new Date(options.from) : new Date();
            return inputDate > minDate;
        });

        // Past date validator
        this.addValidator('past', (value, field, options) => {
            const inputDate = new Date(value);
            const maxDate = options.to ? new Date(options.to) : new Date();
            return inputDate < maxDate;
        });

        // Business hours validator
        this.addValidator('businessHours', (value) => {
            const time = value.split(':').map(n => parseInt(n));
            const hour = time[0];
            const minute = time[1] || 0;
            
            const businessHours = JunraiUtils.getBusinessHours?.() || { open: 18, close: 2 };
            
            if (businessHours.close > businessHours.open) {
                // Same day operation
                return hour >= businessHours.open && hour < businessHours.close;
            } else {
                // Overnight operation
                return hour >= businessHours.open || hour < businessHours.close;
            }
        });

        // Age validator
        this.addValidator('age', (value, field, options) => {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            const minAge = options.min || 18;
            return age >= minAge;
        });
    }

    /**
     * Add custom validator
     */
    addValidator(name, validatorFn) {
        this.customValidators.set(name, validatorFn);
    }

    /**
     * Register form for validation
     */
    registerForm(formElement, rules = {}) {
        if (!formElement) return;

        const formId = formElement.id || JunraiUtils.generateId('form');
        if (!formElement.id) formElement.id = formId;

        const formData = {
            element: formElement,
            rules: rules,
            fields: new Map(),
            isValid: false,
            isDirty: false
        };

        this.forms.set(formId, formData);
        this.setupFormEvents(formElement, formData);
        this.scanFormFields(formElement, formData);
        
        return formId;
    }

    /**
     * Setup form event listeners
     */
    setupFormEvents(formElement, formData) {
        // Form submission
        JunraiUtils.on(formElement, 'submit', (e) => {
            if (!this.validateForm(formData)) {
                e.preventDefault();
                this.focusFirstError(formData);
                return false;
            }
            
            // Add loading state to submit button
            const submitBtn = formElement.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('btn-loading');
                submitBtn.disabled = true;
            }
        });

        // Form reset
        JunraiUtils.on(formElement, 'reset', () => {
            this.resetForm(formData);
        });

        // Mark form as dirty on any change
        JunraiUtils.on(formElement, 'input change', () => {
            formData.isDirty = true;
        });
    }

    /**
     * Scan form fields and setup validation
     */
    scanFormFields(formElement, formData) {
        const fields = formElement.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            this.setupFieldValidation(field, formData);
        });
    }

    /**
     * Setup field validation
     */
    setupFieldValidation(field, formData) {
        const fieldName = field.name || field.id;
        if (!fieldName) return;

        const fieldData = {
            element: field,
            rules: this.getFieldRules(field, formData.rules),
            isValid: true,
            isDirty: false,
            errors: []
        };

        formData.fields.set(fieldName, fieldData);

        // Setup field events
        this.setupFieldEvents(field, fieldData, formData);
        
        // Initial validation state
        this.updateFieldUI(fieldData);
    }

    /**
     * Get validation rules for a field
     */
    getFieldRules(field, formRules) {
        const fieldName = field.name || field.id;
        const rules = [];

        // Form-specific rules
        if (formRules[fieldName]) {
            rules.push(...(Array.isArray(formRules[fieldName]) ? formRules[fieldName] : [formRules[fieldName]]));
        }

        // HTML5 attributes
        if (field.hasAttribute('required')) {
            rules.push({ type: 'required' });
        }

        if (field.type === 'email') {
            rules.push({ type: 'email' });
        }

        if (field.type === 'tel') {
            rules.push({ type: 'phone' });
        }

        if (field.hasAttribute('minlength')) {
            rules.push({ type: 'minLength', min: parseInt(field.getAttribute('minlength')) });
        }

        if (field.hasAttribute('maxlength')) {
            rules.push({ type: 'maxLength', max: parseInt(field.getAttribute('maxlength')) });
        }

        if (field.hasAttribute('min')) {
            rules.push({ type: 'min', min: parseFloat(field.getAttribute('min')) });
        }

        if (field.hasAttribute('max')) {
            rules.push({ type: 'max', max: parseFloat(field.getAttribute('max')) });
        }

        if (field.hasAttribute('pattern')) {
            rules.push({ type: 'pattern', pattern: field.getAttribute('pattern') });
        }

        // Data attributes
        if (field.dataset.match) {
            rules.push({ type: 'match', match: field.dataset.match });
        }

        if (field.dataset.validator) {
            const validators = field.dataset.validator.split(' ');
            validators.forEach(validator => {
                const [type, ...params] = validator.split(':');
                const options = params.length > 0 ? this.parseValidatorParams(params.join(':')) : {};
                rules.push({ type, ...options });
            });
        }

        return rules;
    }

    /**
     * Parse validator parameters
     */
    parseValidatorParams(paramString) {
        try {
            return JSON.parse(paramString);
        } catch {
            // Simple key=value parsing
            const params = {};
            paramString.split(',').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value !== undefined) {
                    params[key.trim()] = isNaN(value) ? value.trim() : parseFloat(value);
                }
            });
            return params;
        }
    }

    /**
     * Setup field event listeners
     */
    setupFieldEvents(field, fieldData, formData) {
        // Real-time validation on input
        JunraiUtils.on(field, 'input', 
            JunraiUtils.debounce(() => {
                fieldData.isDirty = true;
                this.validateField(fieldData, formData);
            }, 300)
        );

        // Validation on blur
        JunraiUtils.on(field, 'blur', () => {
            fieldData.isDirty = true;
            this.validateField(fieldData, formData);
        });

        // Clear errors on focus
        JunraiUtils.on(field, 'focus', () => {
            this.clearFieldErrors(fieldData);
        });

        // Format field value on blur (for specific field types)
        JunraiUtils.on(field, 'blur', () => {
            this.formatFieldValue(field);
        });
    }

    /**
     * Validate a single field
     */
    async validateField(fieldData, formData) {
        const field = fieldData.element;
        const value = field.value.trim();
        const errors = [];

        // Skip validation if field is not dirty and not required
        if (!fieldData.isDirty && !field.hasAttribute('required') && !value) {
            fieldData.isValid = true;
            fieldData.errors = [];
            this.updateFieldUI(fieldData);
            return true;
        }

        // Validate each rule
        for (const rule of fieldData.rules) {
            const isValid = await this.validateRule(value, field, rule);
            
            if (!isValid) {
                const errorMessage = this.getErrorMessage(rule, field);
                errors.push(errorMessage);
                
                // Stop on first error for better UX
                break;
            }
        }

        fieldData.isValid = errors.length === 0;
        fieldData.errors = errors;
        
        this.updateFieldUI(fieldData);
        this.updateFormStatus(formData);
        
        return fieldData.isValid;
    }

    /**
     * Validate a single rule
     */
    async validateRule(value, field, rule) {
        switch (rule.type) {
            case 'required':
                return value !== '';
                
            case 'minLength':
                return !value || value.length >= rule.min;
                
            case 'maxLength':
                return !value || value.length <= rule.max;
                
            case 'min':
                return !value || parseFloat(value) >= rule.min;
                
            case 'max':
                return !value || parseFloat(value) <= rule.max;
                
            case 'pattern':
                return !value || new RegExp(rule.pattern).test(value);
                
            case 'match':
                const matchField = document.getElementById(rule.match) || document.querySelector(`[name="${rule.match}"]`);
                return !value || (matchField && value === matchField.value);
                
            case 'unique':
                return !value || await this.checkUnique(value, rule);
                
            case 'custom':
                return !value || (rule.validator && rule.validator(value, field, rule));
                
            default:
                // Check custom validators
                const validator = this.customValidators.get(rule.type);
                return !value || (validator && validator(value, field, rule));
        }
    }

    /**
     * Check if value is unique (async validation)
     */
    async checkUnique(value, rule) {
        if (!rule.endpoint) return true;
        
        try {
            const response = await JunraiUtils.apiRequest(rule.endpoint, {
                method: 'POST',
                body: JSON.stringify({ value, field: rule.field })
            });
            
            return response.isUnique;
        } catch (error) {
            JunraiUtils.logError(error, 'Unique validation');
            return true; // Don't block submission on validation error
        }
    }

    /**
     * Get error message for rule
     */
    getErrorMessage(rule, field) {
        const lang = 'th'; // Default to Thai
        const messages = this.i18n[lang];
        
        let message = rule.message || messages[rule.type] || messages.pattern;
        
        // Replace placeholders
        if (rule.min !== undefined) {
            message = message.replace('{min}', rule.min);
        }
        if (rule.max !== undefined) {
            message = message.replace('{max}', rule.max);
        }
        
        return message;
    }

    /**
     * Update field UI based on validation state
     */
    updateFieldUI(fieldData) {
        const field = fieldData.element;
        const fieldContainer = field.closest('.form-field') || field.parentElement;
        
        if (!fieldContainer) return;

        // Remove existing classes
        fieldContainer.classList.remove('has-error', 'has-success');
        
        // Remove existing error messages
        const existingError = fieldContainer.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }

        if (fieldData.isDirty) {
            if (fieldData.isValid) {
                fieldContainer.classList.add('has-success');
                this.addFieldIcon(fieldContainer, 'fa-check', 'success');
            } else {
                fieldContainer.classList.add('has-error');
                this.addFieldIcon(fieldContainer, 'fa-times', 'error');
                
                // Add error message
                if (fieldData.errors.length > 0) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'form-error';
                    errorElement.textContent = fieldData.errors[0];
                    fieldContainer.appendChild(errorElement);
                }
            }
        }
    }

    /**
     * Add validation icon to field
     */
    addFieldIcon(container, iconClass, type) {
        // Remove existing icon
        const existingIcon = container.querySelector('.form-field-icon');
        if (existingIcon) {
            existingIcon.remove();
        }

        // Add new icon
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass} form-field-icon ${type}`;
        container.appendChild(icon);
    }

    /**
     * Clear field errors
     */
    clearFieldErrors(fieldData) {
        const field = fieldData.element;
        const fieldContainer = field.closest('.form-field') || field.parentElement;
        
        if (fieldContainer) {
            fieldContainer.classList.remove('has-error');
            
            const errorElement = fieldContainer.querySelector('.form-error');
            if (errorElement) {
                errorElement.remove();
            }
        }
    }

    /**
     * Format field value
     */
    formatFieldValue(field) {
        switch (field.type) {
            case 'tel':
                field.value = this.formatPhoneNumber(field.value);
                break;
                
            case 'text':
                if (field.dataset.format === 'thai-id') {
                    field.value = this.formatThaiId(field.value);
                } else if (field.dataset.format === 'postal-code') {
                    field.value = this.formatPostalCode(field.value);
                }
                break;
        }
    }

    /**
     * Format phone number
     */
    formatPhoneNumber(value) {
        const cleaned = value.replace(/\D/g, '');
        
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        
        return cleaned;
    }

    /**
     * Format Thai ID number
     */
    formatThaiId(value) {
        const cleaned = value.replace(/\D/g, '');
        
        if (cleaned.length === 13) {
            return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12)}`;
        }
        
        return cleaned;
    }

    /**
     * Format postal code
     */
    formatPostalCode(value) {
        return value.replace(/\D/g, '').slice(0, 5);
    }

    /**
     * Validate entire form
     */
    async validateForm(formData) {
        const validationPromises = [];
        
        formData.fields.forEach(fieldData => {
            validationPromises.push(this.validateField(fieldData, formData));
        });
        
        const results = await Promise.all(validationPromises);
        const isValid = results.every(result => result);
        
        formData.isValid = isValid;
        this.updateFormStatus(formData);
        
        return isValid;
    }

    /**
     * Update form status
     */
    updateFormStatus(formData) {
        const form = formData.element;
        const submitBtn = form.querySelector('[type="submit"]');
        
        if (submitBtn) {
            submitBtn.disabled = !formData.isValid || !formData.isDirty;
        }
        
        // Emit form validation event
        JunraiUtils.emit(form, 'junrai:form:validated', {
            isValid: formData.isValid,
            isDirty: formData.isDirty,
            errors: this.getFormErrors(formData)
        });
    }

    /**
     * Get all form errors
     */
    getFormErrors(formData) {
        const errors = {};
        
        formData.fields.forEach((fieldData, fieldName) => {
            if (fieldData.errors.length > 0) {
                errors[fieldName] = fieldData.errors;
            }
        });
        
        return errors;
    }

    /**
     * Focus first field with error
     */
    focusFirstError(formData) {
        for (const [fieldName, fieldData] of formData.fields) {
            if (!fieldData.isValid) {
                fieldData.element.focus();
                break;
            }
        }
    }

    /**
     * Reset form validation state
     */
    resetForm(formData) {
        formData.isDirty = false;
        formData.isValid = false;
        
        formData.fields.forEach(fieldData => {
            fieldData.isDirty = false;
            fieldData.isValid = true;
            fieldData.errors = [];
            this.updateFieldUI(fieldData);
        });
        
        this.updateFormStatus(formData);
    }

    /**
     * Scan for forms on page load
     */
    scanForForms() {
        document.querySelectorAll('form[data-validate]').forEach(form => {
            const rules = form.dataset.rules ? JSON.parse(form.dataset.rules) : {};
            this.registerForm(form, rules);
        });
    }

    /**
     * Setup real-time validation for dynamically added forms
     */
    setupRealTimeValidation() {
        // Observer for dynamically added forms
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if added node is a form
                        if (node.matches && node.matches('form[data-validate]')) {
                            const rules = node.dataset.rules ? JSON.parse(node.dataset.rules) : {};
                            this.registerForm(node, rules);
                        }
                        
                        // Check for forms within added node
                        const forms = node.querySelectorAll && node.querySelectorAll('form[data-validate]');
                        if (forms) {
                            forms.forEach(form => {
                                const rules = form.dataset.rules ? JSON.parse(form.dataset.rules) : {};
                                this.registerForm(form, rules);
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Form submission interceptor for non-registered forms
        JunraiUtils.on(document, 'submit', (e) => {
            const form = e.target;
            if (form.hasAttribute('data-validate') && !this.forms.has(form.id)) {
                e.preventDefault();
                
                const rules = form.dataset.rules ? JSON.parse(form.dataset.rules) : {};
                const formId = this.registerForm(form, rules);
                const formData = this.forms.get(formId);
                
                setTimeout(() => {
                    if (this.validateForm(formData)) {
                        form.submit();
                    } else {
                        this.focusFirstError(formData);
                    }
                }, 100);
            }
        });
    }

    /**
     * Public API methods
     */
    validate(formSelector) {
        const form = typeof formSelector === 'string' ? 
            document.querySelector(formSelector) : formSelector;
            
        if (!form) return false;
        
        const formData = this.forms.get(form.id);
        if (!formData) return false;
        
        return this.validateForm(formData);
    }

    reset(formSelector) {
        const form = typeof formSelector === 'string' ? 
            document.querySelector(formSelector) : formSelector;
            
        if (!form) return;
        
        const formData = this.forms.get(form.id);
        if (formData) {
            this.resetForm(formData);
        }
    }

    setFieldError(formSelector, fieldName, errorMessage) {
        const form = typeof formSelector === 'string' ? 
            document.querySelector(formSelector) : formSelector;
            
        if (!form) return;
        
        const formData = this.forms.get(form.id);
        if (!formData) return;
        
        const fieldData = formData.fields.get(fieldName);
        if (fieldData) {
            fieldData.isValid = false;
            fieldData.errors = [errorMessage];
            fieldData.isDirty = true;
            this.updateFieldUI(fieldData);
            this.updateFormStatus(formData);
        }
    }

    clearErrors(formSelector) {
        const form = typeof formSelector === 'string' ? 
            document.querySelector(formSelector) : formSelector;
            
        if (!form) return;
        
        const formData = this.forms.get(form.id);
        if (!formData) return;
        
        formData.fields.forEach(fieldData => {
            fieldData.errors = [];
            fieldData.isValid = true;
            this.updateFieldUI(fieldData);
        });
        
        this.updateFormStatus(formData);
    }
}

// Initialize form validator
const junraiFormValidator = new JunraiFormValidator();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiFormValidator;
}

// Make available globally
window.JunraiFormValidator = JunraiFormValidator;
window.junraiFormValidator = junraiFormValidator;