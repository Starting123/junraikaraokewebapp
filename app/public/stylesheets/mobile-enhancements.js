// ==========================================
// Mobile Responsive Enhancements
// ==========================================

// Prevent body scroll when modal is open (mobile)
function preventBodyScroll(prevent) {
    if (prevent) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
}

// Enhanced modal functions for mobile
function openPaymentModal(bookingId) {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        // Set booking ID for payment processing
        modal.dataset.bookingId = bookingId;
        
        // Show modal
        modal.style.display = 'flex';
        
        // Prevent body scroll on mobile
        preventBodyScroll(true);
        
        // Focus management for accessibility
        const closeButton = modal.querySelector('.modal-close, .close');
        if (closeButton) {
            setTimeout(() => closeButton.focus(), 100);
        }
        
        // Add event listeners for mobile gestures
        addMobileGestureListeners(modal);
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Re-enable body scroll
        preventBodyScroll(false);
        
        // Remove mobile gesture listeners
        removeMobileGestureListeners(modal);
    }
}

// Mobile gesture support
let touchStartY = 0;
let touchCurrentY = 0;
let modalContent = null;

function addMobileGestureListeners(modal) {
    modalContent = modal.querySelector('.modal-content');
    if (modalContent && window.innerWidth <= 768) {
        modal.addEventListener('touchstart', handleTouchStart, { passive: true });
        modal.addEventListener('touchmove', handleTouchMove, { passive: false });
        modal.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

function removeMobileGestureListeners(modal) {
    if (modal) {
        modal.removeEventListener('touchstart', handleTouchStart);
        modal.removeEventListener('touchmove', handleTouchMove);
        modal.removeEventListener('touchend', handleTouchEnd);
    }
}

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
}

function handleTouchMove(e) {
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchCurrentY - touchStartY;
    
    // Only allow pull to close if at top of modal and pulling down
    if (modalContent && modalContent.scrollTop === 0 && deltaY > 0) {
        e.preventDefault();
        const opacity = Math.max(0.5, 1 - (deltaY / 300));
        const transform = Math.min(deltaY, 150);
        
        modalContent.style.transform = `translateY(${transform}px)`;
        modalContent.style.opacity = opacity;
    }
}

function handleTouchEnd(e) {
    const deltaY = touchCurrentY - touchStartY;
    
    if (modalContent) {
        // If pulled down enough, close modal
        if (deltaY > 100 && modalContent.scrollTop === 0) {
            closePaymentModal();
        } else {
            // Snap back to original position
            modalContent.style.transform = '';
            modalContent.style.opacity = '';
        }
    }
}

// Enhanced payment method selection for mobile
function selectPaymentMethod(method) {
    // Remove active class from all methods
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
        const radio = el.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    // Add active class to selected method
    const selectedMethod = document.querySelector(`input[name="paymentMethod"][value="${method}"]`);
    if (selectedMethod) {
        selectedMethod.checked = true;
        selectedMethod.closest('.payment-method').classList.add('selected');
        
        // Show/hide relevant fields based on payment method
        togglePaymentFields(method);
        
        // Haptic feedback on mobile (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
}

function togglePaymentFields(method) {
    const stripeElement = document.getElementById('card-element-container');
    const traditionalFields = document.querySelector('.traditional-payment-fields');
    const fileUploadArea = document.querySelector('.file-upload-area');
    
    // Hide all fields first
    if (stripeElement) stripeElement.style.display = 'none';
    if (traditionalFields) traditionalFields.style.display = 'none';
    if (fileUploadArea) fileUploadArea.style.display = 'none';
    
    // Show relevant fields based on method
    switch (method) {
        case 'stripe':
            if (stripeElement) stripeElement.style.display = 'block';
            break;
        case 'bank_transfer':
        case 'qr_code':
            if (traditionalFields) traditionalFields.style.display = 'block';
            if (fileUploadArea) fileUploadArea.style.display = 'block';
            break;
        case 'cash':
            // No additional fields needed for cash
            break;
    }
}

// Enhanced file upload for mobile
function setupFileUpload() {
    const fileInput = document.getElementById('payment-proof');
    const uploadArea = document.querySelector('.file-upload-area');
    const preview = document.querySelector('.file-preview');
    
    if (!fileInput || !uploadArea) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selection
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop (desktop)
    if (window.innerWidth > 768) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
        displayFilePreview(files[0]);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    const uploadArea = e.currentTarget;
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        const fileInput = document.getElementById('payment-proof');
        if (fileInput) {
            fileInput.files = files;
            displayFilePreview(files[0]);
        }
    }
}

function displayFilePreview(file) {
    const preview = document.querySelector('.file-preview');
    const previewImg = preview?.querySelector('img');
    const fileInfo = preview?.querySelector('.file-info');
    
    if (!preview) return;
    
    // Show preview
    preview.classList.add('show');
    
    // Display image if it's an image file
    if (file.type.startsWith('image/') && previewImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (previewImg) {
        previewImg.style.display = 'none';
    }
    
    // Update file info
    if (fileInfo) {
        const fileName = file.name.length > 30 ? 
            file.name.substring(0, 30) + '...' : 
            file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        fileInfo.innerHTML = `
            <span>${fileName}</span>
            <span>${fileSize} MB</span>
        `;
    }
}

// Enhanced viewport management
function handleViewportChange() {
    // Update CSS custom properties based on viewport
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Adjust modal height on mobile
    const modal = document.querySelector('.modal-content');
    if (modal && window.innerWidth <= 768) {
        modal.style.height = `${window.innerHeight}px`;
    }
}

// Initialize mobile enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Setup viewport handling
    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleViewportChange, 100);
    });
    
    // Setup file upload
    setupFileUpload();
    
    // Setup payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectPaymentMethod(e.target.value);
        });
    });
    
    // Enhanced modal close buttons
    document.querySelectorAll('.modal-close, .close').forEach(button => {
        button.addEventListener('click', closePaymentModal);
    });
    
    // Close modal when clicking overlay (not on small screens)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && window.innerWidth > 768) {
                closePaymentModal();
            }
        });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePaymentModal();
        }
    });
});