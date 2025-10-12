// contact.js - Contact Page JavaScript
(function() {
    'use strict';
    
    let contactManager;
    
    class ContactManager {
        constructor() {
            this.init();
        }
        
        init() {
            this.setupContactForm();
            this.setupEventListeners();
            this.updateBusinessHours();
        }
        
        setupEventListeners() {
            // Contact form submission
            const contactForm = document.getElementById('contact-form');
            if (contactForm) {
                contactForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleContactSubmission(e.target);
                });
            }
            
            // Phone number formatting
            const phoneInput = document.getElementById('contact-phone');
            if (phoneInput) {
                phoneInput.addEventListener('input', (e) => {
                    this.formatPhoneNumber(e.target);
                });
            }
        }
        
        setupContactForm() {
            // Setup form validation
            const form = document.getElementById('contact-form');
            if (!form) return;
            
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
                
                input.addEventListener('input', () => {
                    this.clearFieldError(input);
                });
            });
        }
        
        async handleContactSubmission(form) {
            const submitBtn = form.querySelector('.btn-submit');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            // Show loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            
            try {
                const formData = new FormData(form);
                const contactData = {
                    name: `${formData.get('firstname')} ${formData.get('lastname')}`.trim(),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    subject: formData.get('subject'),
                    message: formData.get('message'),
                    preferredContact: formData.get('preferredContact')
                };
                
                // Validate form data
                if (!this.validateContactData(contactData)) {
                    return;
                }
                
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(contactData)
                });
                
                if (response.ok) {
                    this.showSuccessMessage('ขอบคุณสำหรับข้อความของคุณ เราจะติดต่อกลับโดยเร็วที่สุด');
                    form.reset();
                } else {
                    throw new Error('Failed to send message');
                }
                
            } catch (error) {
                console.error('Contact form error:', error);
                this.showErrorMessage('เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง');
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
        }
        
        validateContactData(data) {
            let isValid = true;
            
            // Name validation
            if (!data.name.trim()) {
                this.showFieldError('contact-firstname', 'กรุณากรอกชื่อ');
                isValid = false;
            }
            
            // Email validation
            if (!data.email || !this.isValidEmail(data.email)) {
                this.showFieldError('contact-email', 'กรุณากรอกอีเมลที่ถูกต้อง');
                isValid = false;
            }
            
            // Phone validation
            if (!data.phone || !this.isValidPhone(data.phone)) {
                this.showFieldError('contact-phone', 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง');
                isValid = false;
            }
            
            // Subject validation
            if (!data.subject.trim()) {
                this.showFieldError('contact-subject', 'กรุณาเลือกหัวข้อ');
                isValid = false;
            }
            
            // Message validation
            if (!data.message.trim()) {
                this.showFieldError('contact-message', 'กรุณากรอกข้อความ');
                isValid = false;
            }
            
            return isValid;
        }
        
        validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            
            switch (field.type) {
                case 'email':
                    if (value && !this.isValidEmail(value)) {
                        this.showFieldError(field.id, 'รูปแบบอีเมลไม่ถูกต้อง');
                        isValid = false;
                    }
                    break;
                    
                case 'tel':
                    if (value && !this.isValidPhone(value)) {
                        this.showFieldError(field.id, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
                        isValid = false;
                    }
                    break;
                    
                default:
                    if (field.required && !value) {
                        this.showFieldError(field.id, 'กรุณากรอกข้อมูลในช่องนี้');
                        isValid = false;
                    }
            }
            
            if (isValid) {
                this.clearFieldError(field.id);
            }
            
            return isValid;
        }
        
        showFieldError(fieldId, message) {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(`${fieldId}-error`);
            
            if (field) {
                field.classList.add('error');
            }
            
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        }
        
        clearFieldError(fieldId) {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(`${fieldId}-error`);
            
            if (field) {
                field.classList.remove('error');
            }
            
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
        
        formatPhoneNumber(input) {
            let value = input.value.replace(/\D/g, '');
            
            if (value.length >= 10) {
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            } else if (value.length >= 6) {
                value = value.replace(/(\d{3})(\d{3})/, '$1-$2');
            } else if (value.length >= 3) {
                value = value.replace(/(\d{3})/, '$1');
            }
            
            input.value = value;
        }
        
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        isValidPhone(phone) {
            const phoneRegex = /^[0-9]{10}$|^[0-9]{3}-[0-9]{3}-[0-9]{4}$/;
            return phoneRegex.test(phone.replace(/\D/g, ''));
        }
        
        updateBusinessHours() {
            const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
            const hourItems = document.querySelectorAll('.hours-item');
            
            hourItems.forEach((item, index) => {
                const dayElement = item.querySelector('.day');
                if (index === today && dayElement) {
                    dayElement.classList.add('today');
                }
            });
        }
        
        showSuccessMessage(message) {
            const successElement = document.getElementById('contact-success');
            const errorElement = document.getElementById('contact-error');
            
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            
            if (successElement) {
                successElement.querySelector('p').textContent = message;
                successElement.style.display = 'flex';
                
                // Auto hide after 5 seconds
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 5000);
            }
            
            // Scroll to top to show message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        showErrorMessage(message) {
            const successElement = document.getElementById('contact-success');
            const errorElement = document.getElementById('contact-error');
            
            if (successElement) {
                successElement.style.display = 'none';
            }
            
            if (errorElement) {
                errorElement.querySelector('p').textContent = message;
                errorElement.style.display = 'flex';
                
                // Auto hide after 5 seconds
                setTimeout(() => {
                    errorElement.style.display = 'none';
                }, 5000);
            }
            
            // Scroll to top to show message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            contactManager = new ContactManager();
        });
    } else {
        contactManager = new ContactManager();
    }
    
    // Export for global access
    window.ContactManager = ContactManager;
})();