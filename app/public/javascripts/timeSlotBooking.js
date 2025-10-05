/**
 * Time Slot Booking System - Frontend JavaScript
 * Cinema-style time slot selection for karaoke room booking
 */

class TimeSlotBooking {
    constructor() {
        this.selectedSlots = new Set();
        this.roomId = null;
        this.selectedDate = null;
        this.timeSlots = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialData();
    }

    initializeElements() {
        // Main containers
        this.container = document.getElementById('booking-container');
        this.timeSlotsGrid = document.getElementById('time-slots-grid');
        this.selectedSlotSummary = document.getElementById('selected-slot-summary');
        this.bookingActions = document.getElementById('booking-actions');
        
        // Form elements
        this.roomSelect = document.getElementById('room_id');
        this.dateInput = document.getElementById('booking_date');
        this.bookButton = document.getElementById('book-button');
        this.clearButton = document.getElementById('clear-selection');
        
        // Summary elements
        this.selectedSlotsCount = document.getElementById('selected-slots-count');
        this.selectedTimeRange = document.getElementById('selected-time-range');
        this.totalDuration = document.getElementById('total-duration');
        this.totalPrice = document.getElementById('total-price');
        
        // Loading indicator
        this.loadingIndicator = document.getElementById('loading-indicator');
        
        // Error message container
        this.errorContainer = document.getElementById('error-message');
    }

    bindEvents() {
        // Room selection change
        if (this.roomSelect) {
            this.roomSelect.addEventListener('change', () => {
                this.onRoomChange();
            });
        }

        // Date selection change
        if (this.dateInput) {
            this.dateInput.addEventListener('change', () => {
                this.onDateChange();
            });
        }

        // Book button
        if (this.bookButton) {
            this.bookButton.addEventListener('click', () => {
                this.createBooking();
            });
        }

        // Clear selection button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearSelection();
            });
        }

        // Time slot grid (event delegation)
        if (this.timeSlotsGrid) {
            this.timeSlotsGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('time-slot') && 
                    e.target.classList.contains('available')) {
                    this.toggleTimeSlot(e.target);
                }
            });
        }
    }

    loadInitialData() {
        // Set default date to today
        if (this.dateInput) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.dateInput.value = tomorrow.toISOString().split('T')[0];
            this.selectedDate = this.dateInput.value;
        }

        // Load time slots if room is already selected
        if (this.roomSelect && this.roomSelect.value) {
            this.roomId = parseInt(this.roomSelect.value);
            this.loadTimeSlots();
        }
    }

    async onRoomChange() {
        const selectedRoomId = this.roomSelect.value;
        if (!selectedRoomId) {
            this.clearTimeSlots();
            return;
        }

        this.roomId = parseInt(selectedRoomId);
        this.clearSelection();
        await this.loadTimeSlots();
    }

    async onDateChange() {
        this.selectedDate = this.dateInput.value;
        if (!this.selectedDate || !this.roomId) return;

        this.clearSelection();
        await this.loadTimeSlots();
    }

    async loadTimeSlots() {
        if (!this.roomId || !this.selectedDate) return;

        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`/api/rooms/${this.roomId}/slots?date=${this.selectedDate}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to load time slots');
            }

            this.timeSlots = data.slots || [];
            this.renderTimeSlots();
        } catch (error) {
            console.error('Error loading time slots:', error);
            this.showError('ไม่สามารถโหลดตารางเวลาจองได้: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderTimeSlots() {
        if (!this.timeSlotsGrid) return;

        if (this.timeSlots.length === 0) {
            this.timeSlotsGrid.innerHTML = `
                <div class="no-slots-message">
                    <p>ไม่มีช่วงเวลาที่สามารถจองได้สำหรับวันที่เลือก</p>
                </div>
            `;
            return;
        }

        const slotsHTML = this.timeSlots.map(slot => {
            const isPast = slot.isPast || new Date(slot.start_datetime) < new Date();
            const isBooked = slot.isBooked || false;
            const isAvailable = !isPast && !isBooked;
            
            const statusClass = isPast ? 'past' : 
                               isBooked ? 'booked' : 'available';
            
            // แก้ไขปัญหา undefined โดยใช้ fallback values
            const timeDisplay = slot.time_display || `${slot.start_time || 'N/A'} - ${slot.end_time || 'N/A'}`;
            const startDatetime = slot.start_datetime || '';
            const endDatetime = slot.end_datetime || '';
            
            return `
                <button 
                    class="time-slot ${statusClass}" 
                    data-start="${startDatetime}"
                    data-end="${endDatetime}"
                    data-time="${timeDisplay}"
                    ${!isAvailable ? 'disabled' : ''}
                >
                    ${timeDisplay}
                </button>
            `;
        }).join('');

        this.timeSlotsGrid.innerHTML = slotsHTML;
    }

    toggleTimeSlot(slotElement) {
        const startTime = slotElement.dataset.start;
        const isSelected = slotElement.classList.contains('selected');

        if (isSelected) {
            // Deselect
            slotElement.classList.remove('selected');
            this.selectedSlots.delete(startTime);
        } else {
            // Select
            slotElement.classList.add('selected');
            this.selectedSlots.add(startTime);
        }

        this.updateSelectionSummary();
        this.updateBookingActions();
    }

    updateSelectionSummary() {
        if (!this.selectedSlotSummary) return;

        const selectedCount = this.selectedSlots.size;
        
        if (selectedCount === 0) {
            this.selectedSlotSummary.style.display = 'none';
            return;
        }

        this.selectedSlotSummary.style.display = 'block';

        // Update count
        if (this.selectedSlotsCount) {
            this.selectedSlotsCount.textContent = selectedCount;
        }

        // Calculate time range and duration
        const sortedTimes = Array.from(this.selectedSlots).sort();
        const timeRange = this.calculateTimeRange(sortedTimes);
        
        if (this.selectedTimeRange) {
            this.selectedTimeRange.textContent = timeRange.display;
        }

        if (this.totalDuration) {
            this.totalDuration.textContent = `${timeRange.duration} ชั่วโมง`;
        }

        // Calculate price (assuming 100 THB per hour)
        if (this.totalPrice) {
            const totalPrice = timeRange.duration * 100;
            this.totalPrice.textContent = `${totalPrice.toLocaleString()} บาท`;
        }
    }

    calculateTimeRange(sortedStartTimes) {
        if (sortedStartTimes.length === 0) {
            return { display: '', duration: 0 };
        }

        // Find corresponding end times for each start time
        const slots = sortedStartTimes.map(startTime => {
            const slotElement = this.timeSlotsGrid.querySelector(`[data-start="${startTime}"]`);
            return {
                start: startTime,
                end: slotElement.dataset.end,
                display: slotElement.dataset.time
            };
        });

        const firstSlot = slots[0];
        const lastSlot = slots[slots.length - 1];
        
        const startTime = new Date(firstSlot.start).toLocaleTimeString('th-TH', {
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        const endTime = new Date(lastSlot.end).toLocaleTimeString('th-TH', {
            hour: '2-digit', 
            minute: '2-digit'
        });

        // Calculate total duration
        const totalMs = new Date(lastSlot.end) - new Date(firstSlot.start);
        const duration = totalMs / (1000 * 60 * 60);

        return {
            display: `${startTime} - ${endTime}`,
            duration: duration,
            start: firstSlot.start,
            end: lastSlot.end
        };
    }

    updateBookingActions() {
        if (!this.bookingActions) return;

        const hasSelection = this.selectedSlots.size > 0;
        this.bookingActions.style.display = hasSelection ? 'block' : 'none';
        
        if (this.bookButton) {
            this.bookButton.disabled = !hasSelection || this.isLoading;
        }
    }

    clearSelection() {
        this.selectedSlots.clear();
        
        // Remove selected class from all slots
        const selectedElements = this.timeSlotsGrid.querySelectorAll('.time-slot.selected');
        selectedElements.forEach(element => {
            element.classList.remove('selected');
        });

        this.updateSelectionSummary();
        this.updateBookingActions();
    }

    clearTimeSlots() {
        if (this.timeSlotsGrid) {
            this.timeSlotsGrid.innerHTML = '';
        }
        this.clearSelection();
    }

    async createBooking() {
        if (this.selectedSlots.size === 0) {
            this.showError('กรุณาเลือกช่วงเวลาที่ต้องการจอง');
            return;
        }

        this.isLoading = true;
        this.bookButton.disabled = true;
        this.hideError();

        try {
            const timeRange = this.calculateTimeRange(Array.from(this.selectedSlots).sort());
            
            const bookingData = {
                room_id: this.roomId,
                start_datetime: timeRange.start,
                end_datetime: timeRange.end
            };

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('กรุณาเข้าสู่ระบบก่อนทำการจอง');
            }

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.error === 'time_slot_unavailable') {
                    this.handleBookingConflict(result);
                } else {
                    throw new Error(result.message || 'การจองไม่สำเร็จ');
                }
                return;
            }

            // Booking successful
            this.showSuccess(result.message || 'จองห้องสำเร็จ');
            this.clearSelection();
            await this.loadTimeSlots(); // Refresh slots

        } catch (error) {
            console.error('Booking error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการจอง');
        } finally {
            this.isLoading = false;
            this.bookButton.disabled = false;
        }
    }

    handleBookingConflict(conflictData) {
        let message = conflictData.message || 'ช่วงเวลาที่เลือกไม่สามารถจองได้';
        
        if (conflictData.alternative_slots && conflictData.alternative_slots.length > 0) {
            message += '\n\nช่วงเวลาทางเลือก:';
            conflictData.alternative_slots.forEach(slot => {
                message += `\n• ${slot.time_display}`;
            });
        }

        this.showError(message);
    }

    showLoading(show) {
        this.isLoading = show;
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'block' : 'none';
        }
        if (this.timeSlotsGrid && show) {
            this.timeSlotsGrid.innerHTML = '<div class="loading-slots">กำลังโหลด...</div>';
        }
    }

    showError(message) {
        if (this.errorContainer) {
            this.errorContainer.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message.replace(/\n/g, '<br>')}
                </div>
            `;
            this.errorContainer.style.display = 'block';
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (this.errorContainer) {
            this.errorContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    ${message}
                </div>
            `;
            this.errorContainer.style.display = 'block';
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                this.hideError();
            }, 5000);
        } else {
            alert(message);
        }
    }

    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the booking page
    if (document.getElementById('booking-container')) {
        window.timeSlotBooking = new TimeSlotBooking();
    }
});

// Utility functions for other pages
window.BookingUtils = {
    formatThaiDateTime: (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatThaiTime: (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    calculateDuration: (startDateTime, endDateTime) => {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        const durationMs = end - start;
        return Math.ceil(durationMs / (1000 * 60 * 60)); // hours
    }
};