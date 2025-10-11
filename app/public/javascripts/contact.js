// ==========================================
// Contact Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };

            // Validate form
            if (!validateForm(data)) {
                return;
            }

            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (!submitBtn) return;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> \u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e48\u0e07...';
            submitBtn.disabled = true;

            // Simulate API call (replace with actual API endpoint)
            setTimeout(() => {
                showNotification('\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27! \u0e40\u0e23\u0e32\u0e08\u0e30\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e01\u0e25\u0e31\u0e1a\u0e43\u0e19\u0e40\u0e23\u0e47\u0e27\u0e46 \u0e19\u0e35\u0e49', 'success');
                contactForm.reset();

                // Restore button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
    
    // Form validation
    function validateForm(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length < 2) {
            errors.push('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e0a\u0e37\u0e48\u0e2d-\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25 (\u0e2d\u0e22\u0e48\u0e19\u0e19\u0e49\u0e2d\u0e22 2 \u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23)');
        }
        
        if (!data.email || !isValidEmail(data.email)) {
            errors.push('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e2d\u0e35\u0e40\u0e21\u0e25\u0e17\u0e35\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07');
        }
        
        if (!data.subject) {
            errors.push('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d');
        }
        
        if (!data.message || data.message.trim().length < 10) {
            errors.push('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21 (\u0e2d\u0e22\u0e48\u0e19\u0e19\u0e49\u0e2d\u0e22 10 \u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23)');
        }
        
        if (errors.length > 0) {
            showNotification(errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
})
