/**
 * Booking Module
 * Handles booking form submission and validation
 */

class BookingManager {
    constructor(apiBase) {
        this.API_BASE = apiBase;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
            this.setDefaultDateTime();
        });
    }

    bindEvents() {
        const bookingForm = document.getElementById('newBookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', this.handleBookingSubmit.bind(this));
        }
    }

    async handleBookingSubmit(event) {
        event.preventDefault();
        
        // Get form elements with null checks
        const elements = this.getFormElements();
        if (!elements.isValid) {
            this.showToast('ข้อผิดพลาด: ไม่พบข้อมูลในฟอร์ม', 'error');
            return;
        }

        const formData = this.collectFormData(elements);
        
        // Validate form data
        const validation = this.validateBookingData(formData);
        if (!validation.isValid) {
            this.showToast(validation.message, 'error');
            return;
        }

        await this.submitBooking(formData);
    }

    getFormElements() {
        const fullnameEl = document.getElementById('fullname');
        const phoneEl = document.getElementById('phone');
        const addressEl = document.getElementById('address');
        const roomIdEl = document.getElementById('selectedRoomId');
        const startTimeEl = document.getElementById('start_time');
        const endTimeEl = document.getElementById('end_time');
        
        // Check if required elements exist
        const isValid = fullnameEl && phoneEl && roomIdEl && startTimeEl && endTimeEl;
        
        return {
            isValid,
            fullnameEl,
            phoneEl,
            addressEl,
            roomIdEl,
            startTimeEl,
            endTimeEl
        };
    }

    collectFormData(elements) {
        return {
            fullname: elements.fullnameEl.value.trim(),
            phone: elements.phoneEl.value.trim(),
            address: elements.addressEl ? elements.addressEl.value.trim() : '',
            roomId: elements.roomIdEl.value,
            startDateTime: elements.startTimeEl.value,
            endDateTime: elements.endTimeEl.value
        };
    }

    validateBookingData(data) {
        // Check required fields
        if (!data.fullname || !data.phone || !data.roomId || !data.startDateTime || !data.endDateTime) {
            return { isValid: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
        }

        // Validate phone format (basic Thai phone format)
        const phonePattern = /^[0-9\-\+\(\)\s]{9,15}$/;
        if (!phonePattern.test(data.phone)) {
            return { isValid: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' };
        }

        // Validate datetime
        const start = new Date(data.startDateTime);
        const end = new Date(data.endDateTime);
        const now = new Date();
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return { isValid: false, message: 'รูปแบบวันที่และเวลาไม่ถูกต้อง' };
        }

        if (start <= now) {
            return { isValid: false, message: 'เวลาเริ่มต้องเป็นในอนาคต' };
        }

        if (end <= start) {
            return { isValid: false, message: 'เวลาสิ้นสุดต้องหลังจากเวลาเริ่ม' };
        }

        // Check minimum booking duration (1 hour)
        const durationMs = end.getTime() - start.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        if (durationHours < 1) {
            return { isValid: false, message: 'การจองต้องมีระยะเวลาอย่างน้อย 1 ชั่วโมง' };
        }

        // Check maximum booking duration (12 hours)
        if (durationHours > 12) {
            return { isValid: false, message: 'การจองต้องมีระยะเวลาไม่เกิน 12 ชั่วโมง' };
        }

        return { isValid: true };
    }

    async submitBooking(data) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showToast('กรุณาเข้าสู่ระบบก่อนทำการจอง', 'error');
                return;
            }

            const response = await fetch(`${this.API_BASE}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullname: data.fullname,
                    phone: data.phone,
                    address: data.address,
                    room_id: parseInt(data.roomId),
                    start_time: data.startDateTime,
                    end_time: data.endDateTime
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showToast(result.message || 'จองห้องสำเร็จ!', 'success');
                this.resetBookingForm();
                
                // Refresh related data
                if (typeof loadAvailableRooms === 'function') {
                    loadAvailableRooms();
                }
                if (typeof loadMyBookings === 'function') {
                    loadMyBookings();
                }
            } else {
                let errorMessage = 'เกิดข้อผิดพลาดในการจอง';
                
                if (result.data && result.data.suggestion) {
                    errorMessage = `${result.message}\n${result.data.suggestion}`;
                } else if (result.message) {
                    errorMessage = result.message;
                }
                
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Booking submission error:', error);
            this.showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่', 'error');
        }
    }

    resetBookingForm() {
        const form = document.getElementById('newBookingForm');
        if (form) {
            form.reset();
        }
        
        const bookingFormDiv = document.getElementById('bookingForm');
        if (bookingFormDiv) {
            bookingFormDiv.style.display = 'none';
        }
        
        const selectedRoomInfo = document.getElementById('selectedRoomInfo');
        if (selectedRoomInfo) {
            selectedRoomInfo.innerHTML = '';
        }
        
        const bookingSummary = document.getElementById('bookingSummary');
        if (bookingSummary) {
            bookingSummary.innerHTML = '';
        }
        
        this.setDefaultDateTime();
    }

    setDefaultDateTime() {
        // Set default start time to next hour
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        
        // Set default end time to 2 hours later
        const defaultEnd = new Date(nextHour);
        defaultEnd.setHours(defaultEnd.getHours() + 1);
        
        const startInput = document.getElementById('start_time');
        const endInput = document.getElementById('end_time');
        
        if (startInput) {
            startInput.value = this.formatDateTimeLocal(nextHour);
        }
        
        if (endInput) {
            endInput.value = this.formatDateTimeLocal(defaultEnd);
        }
    }

    formatDateTimeLocal(date) {
        const pad = (num) => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    showToast(message, type = 'info') {
        // Use existing toast function if available, otherwise use alert as fallback
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback to alert
            if (type === 'error') {
                alert('❌ ' + message);
            } else if (type === 'success') {
                alert('✅ ' + message);
            } else {
                alert('ℹ️ ' + message);
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingManager;
}

// Auto-initialize if window.API_BASE is available
if (typeof window !== 'undefined' && window.API_BASE) {
    window.bookingManager = new BookingManager(window.API_BASE);
}