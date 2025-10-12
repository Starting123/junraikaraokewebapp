/**
 * Payment Module
 * Handles payment processing, receipt upload, and payment status
 */

class PaymentModule {
    constructor() {
        this.currentBooking = null;
        this.uploadedFile = null;
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.loadPaymentData();
        
        this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submissions
        window.EventBus.on('form:submit', (event) => {
            const { module, action, form, originalEvent } = event.data;
            
            if (module === 'payment') {
                originalEvent.preventDefault();
                
                switch (action) {
                    case 'upload-receipt':
                        this.handleReceiptUpload(form);
                        break;
                    case 'confirm-payment':
                        this.handlePaymentConfirmation(form);
                        break;
                }
            }
        });

        // UI actions
        window.EventBus.on('ui:action', (event) => {
            const { action, element, data } = event.data;
            
            switch (action) {
                case 'select-payment-file':
                    this.selectPaymentFile();
                    break;
                case 'clear-payment-file':
                    this.clearPaymentFile();
                    break;
                case 'download-receipt':
                    this.downloadReceipt(data.bookingId);
                    break;
                case 'retry-payment':
                    this.retryPayment(data.bookingId);
                    break;
                case 'go-back':
                    this.goBack();
                    break;
                case 'go-to-dashboard':
                    window.location.href = '/dashboard';
                    break;
                case 'go-to-bookings':
                    window.location.href = '/bookings';
                    break;
            }
        });

        // File input change handler
        const fileInput = window.DOM.$('#paymentProofFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });
        }
    }

    /**
     * Load payment data from URL params
     */
    loadPaymentData() {
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('booking');
        
        if (bookingId) {
            this.loadBookingForPayment(bookingId);
        }
    }

    /**
     * Load booking details for payment
     */
    async loadBookingForPayment(bookingId) {
        try {
            const response = await window.API.get(`/bookings/${bookingId}`);
            this.currentBooking = response.booking || response;
            
            this.renderPaymentDetails();
            
        } catch (error) {
            console.error('Error loading booking for payment:', error);
            this.showError('ไม่สามารถโหลดข้อมูลการจองได้');
        }
    }

    /**
     * Select payment proof file
     */
    selectPaymentFile() {
        const fileInput = window.DOM.$('#paymentProofFile');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelection(file) {
        if (!file) return;

        // Validate file
        if (!this.validatePaymentFile(file)) {
            return;
        }

        this.uploadedFile = file;
        this.displayFilePreview(file);
        
        // Update UI
        const fileName = window.DOM.$('#fileName');
        if (fileName) {
            fileName.textContent = file.name;
        }
    }

    /**
     * Validate payment proof file
     */
    validatePaymentFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            this.showError('กรุณาเลือกไฟล์ JPG, PNG หรือ PDF เท่านั้น');
            return false;
        }

        if (file.size > maxSize) {
            this.showError('ขนาดไฟล์ต้องไม่เกิน 5MB');
            return false;
        }

        return true;
    }

    /**
     * Display file preview
     */
    displayFilePreview(file) {
        const previewContainer = window.DOM.$('#filePreview');
        const previewImage = window.DOM.$('#previewImage');
        const fileInfo = window.DOM.$('#fileInfo');
        
        if (!previewContainer) return;

        // Show preview container
        window.DOM.show(previewContainer);

        // Update file info
        if (fileInfo) {
            const sizeText = this.formatFileSize(file.size);
            fileInfo.textContent = `${file.name} (${sizeText})`;
        }

        // Show image preview if it's an image
        if (file.type.startsWith('image/') && previewImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                window.DOM.show(previewImage);
            };
            reader.readAsDataURL(file);
        } else if (previewImage) {
            window.DOM.hide(previewImage);
        }
    }

    /**
     * Clear selected file
     */
    clearPaymentFile() {
        this.uploadedFile = null;
        
        const fileInput = window.DOM.$('#paymentProofFile');
        const previewContainer = window.DOM.$('#filePreview');
        const fileName = window.DOM.$('#fileName');
        
        if (fileInput) fileInput.value = '';
        if (previewContainer) window.DOM.hide(previewContainer);
        if (fileName) fileName.textContent = 'ยังไม่ได้เลือกไฟล์';
    }

    /**
     * Handle receipt upload
     */
    async handleReceiptUpload(form) {
        if (!this.uploadedFile) {
            this.showError('กรุณาเลือกไฟล์สลิปการชำระเงิน');
            return;
        }

        if (!this.currentBooking) {
            this.showError('ไม่พบข้อมูลการจอง');
            return;
        }

        this.showLoading(true);

        try {
            const formData = new FormData();
            formData.append('payment_proof', this.uploadedFile);
            formData.append('booking_id', this.currentBooking.booking_id);

            const response = await window.API.upload('/payments/upload-receipt', formData);
            
            this.showSuccess('อัปโหลดสลิปสำเร็จ! กำลังตรวจสอบการชำระเงิน');
            
            // Redirect to success page or booking details
            setTimeout(() => {
                window.location.href = '/payment/success';
            }, 2000);
            
        } catch (error) {
            console.error('Receipt upload error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิป');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle payment confirmation
     */
    async handlePaymentConfirmation(form) {
        if (!this.currentBooking) {
            this.showError('ไม่พบข้อมูลการจอง');
            return;
        }

        try {
            const response = await window.API.post(`/bookings/${this.currentBooking.booking_id}/confirm-payment`);
            
            this.showSuccess('ยืนยันการชำระเงินสำเร็จ!');
            
            // Redirect to bookings or dashboard
            setTimeout(() => {
                window.location.href = '/bookings';
            }, 2000);
            
        } catch (error) {
            console.error('Payment confirmation error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน');
        }
    }

    /**
     * Download receipt
     */
    async downloadReceipt(bookingId) {
        try {
            // Create download link
            const link = document.createElement('a');
            link.href = `/api/bookings/${bookingId}/receipt`;
            link.download = `receipt-${bookingId}.pdf`;
            link.target = '_blank';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Receipt download error:', error);
            this.showError('ไม่สามารถดาวน์โหลดใบเสร็จได้');
        }
    }

    /**
     * Retry payment for a booking
     */
    retryPayment(bookingId) {
        window.location.href = `/payment?booking=${bookingId}`;
    }

    /**
     * Go back to previous page
     */
    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/bookings';
        }
    }

    /**
     * Render payment details
     */
    renderPaymentDetails() {
        if (!this.currentBooking) return;

        const container = window.DOM.$('#paymentDetails');
        if (!container) return;

        const booking = this.currentBooking;
        const date = new Date(booking.booking_date).toLocaleDateString('th-TH');
        const startTime = booking.start_time ? booking.start_time.substring(0, 5) : '';
        const endTime = booking.end_time ? booking.end_time.substring(0, 5) : '';

        container.innerHTML = `
            <div class="payment-summary">
                <h3>รายละเอียดการจอง</h3>
                
                <div class="booking-info">
                    <div class="info-row">
                        <span class="label">หมายเลขการจอง:</span>
                        <span class="value">#${booking.booking_id}</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">ห้อง:</span>
                        <span class="value">${booking.room_name || 'ห้อง ' + booking.room_id}</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">วันที่:</span>
                        <span class="value">${date}</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">เวลา:</span>
                        <span class="value">${startTime} - ${endTime}</span>
                    </div>
                    
                    <div class="info-row total">
                        <span class="label">ยอดรวม:</span>
                        <span class="value">฿${booking.total_price}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const submitBtn = window.DOM.$('button[type="submit"]');
        const loadingText = show ? 
            '<i class="fas fa-spinner fa-spin"></i> กำลังอัปโหลด...' : 
            '<i class="fas fa-check"></i> ชำระเงิน';
        
        if (submitBtn) {
            submitBtn.innerHTML = loadingText;
            submitBtn.disabled = show;
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        window.EventBus.emit('toast:show', { message, type: 'success' });
    }

    /**
     * Show error message
     */
    showError(message) {
        window.EventBus.emit('toast:show', { message, type: 'error' });
    }

    /**
     * Process Stripe payment (if implemented)
     */
    async processStripePayment(bookingId) {
        try {
            // This would integrate with Stripe API
            const response = await window.API.post(`/payments/stripe/process`, {
                booking_id: bookingId
            });
            
            if (response.client_secret) {
                // Redirect to Stripe payment flow
                // Implementation would depend on Stripe integration
            }
            
        } catch (error) {
            console.error('Stripe payment error:', error);
            this.showError('เกิดข้อผิดพลาดในการชำระเงินด้วยบัตรเครดิต');
        }
    }

    /**
     * Show payment methods modal
     */
    showPaymentMethods() {
        const modal = window.DOM.$('#paymentMethodsModal');
        if (modal) {
            window.DOM.show(modal, 'flex');
        }
    }

    /**
     * Hide payment methods modal
     */
    hidePaymentMethods() {
        const modal = window.DOM.$('#paymentMethodsModal');
        if (modal) {
            window.DOM.hide(modal);
        }
    }
}

// Create global instance
window.Payment = new PaymentModule();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentModule;
}