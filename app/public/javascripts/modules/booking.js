/**
 * ================================================================
 * JUNRAI KARAOKE - BOOKING SYSTEM MODULE
 * Modern booking management with enhanced UX
 * ================================================================
 */

class JunraiBooking {
    constructor() {
        this.selectedSlots = new Set();
        this.currentRoom = null;
        this.selectedDate = null;
        this.availableSlots = [];
        this.roomData = null;
        this.priceCalculator = null;
        
        this.init();
    }

    /**
     * Initialize booking system
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.setupPriceCalculator();
        this.loadInitialData();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Main containers
        this.bookingContainer = JunraiUtils.findElement('#booking-container');
        this.roomSelector = JunraiUtils.findElement('#room-selector');
        this.dateSelector = JunraiUtils.findElement('#date-selector');
        this.timeSlotsGrid = JunraiUtils.findElement('#time-slots-grid');
        this.bookingSummary = JunraiUtils.findElement('#booking-summary');
        this.bookingForm = JunraiUtils.findElement('#booking-form');
        
        // Form elements
        this.roomSelect = JunraiUtils.findElement('#room_id');
        this.dateInput = JunraiUtils.findElement('#booking_date');
        this.guestCountInput = JunraiUtils.findElement('#guest_count');
        this.specialRequestsTextarea = JunraiUtils.findElement('#special_requests');
        
        // Action buttons
        this.bookButton = JunraiUtils.findElement('#book-button');
        this.clearButton = JunraiUtils.findElement('#clear-selection');
        this.refreshButton = JunraiUtils.findElement('#refresh-slots');
        
        // Summary elements
        this.selectedSlotsDisplay = JunraiUtils.findElement('#selected-slots-display');
        this.totalDurationDisplay = JunraiUtils.findElement('#total-duration');
        this.totalPriceDisplay = JunraiUtils.findElement('#total-price');
        this.roomInfoDisplay = JunraiUtils.findElement('#room-info-display');
        
        // Loading and error elements
        this.loadingOverlay = JunraiUtils.findElement('#booking-loading');
        this.errorDisplay = JunraiUtils.findElement('#booking-error');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Room selection
        if (this.roomSelect) {
            JunraiUtils.on(this.roomSelect, 'change', this.handleRoomChange.bind(this));
        }

        // Date selection
        if (this.dateInput) {
            JunraiUtils.on(this.dateInput, 'change', this.handleDateChange.bind(this));
        }

        // Guest count change
        if (this.guestCountInput) {
            JunraiUtils.on(this.guestCountInput, 'input', 
                JunraiUtils.debounce(this.handleGuestCountChange.bind(this), 300));
        }

        // Action buttons
        if (this.bookButton) {
            JunraiUtils.on(this.bookButton, 'click', this.handleBooking.bind(this));
        }

        if (this.clearButton) {
            JunraiUtils.on(this.clearButton, 'click', this.clearSelection.bind(this));
        }

        if (this.refreshButton) {
            JunraiUtils.on(this.refreshButton, 'click', this.refreshTimeSlots.bind(this));
        }

        // Form submission
        if (this.bookingForm) {
            JunraiUtils.on(this.bookingForm, 'submit', this.handleFormSubmit.bind(this));
        }

        // Global events
        JunraiUtils.on(document, 'junrai:booking:slot-selected', this.handleSlotSelection.bind(this));
        JunraiUtils.on(document, 'junrai:booking:room-updated', this.handleRoomUpdate.bind(this));
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this.showLoading('กำลังโหลดข้อมูลห้อง...');
            
            // Load rooms data
            const roomsResponse = await JunraiUtils.apiRequest('/api/rooms');
            if (roomsResponse.success) {
                this.populateRooms(roomsResponse.rooms);
            }

            // Set default date to today
            if (this.dateInput && !this.dateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                this.dateInput.value = today;
                this.selectedDate = today;
            }

            // Load time slots if room is pre-selected
            if (this.roomSelect && this.roomSelect.value) {
                await this.loadTimeSlots();
            }

        } catch (error) {
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            JunraiUtils.logError(error, 'Booking initialization');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Populate rooms dropdown
     */
    populateRooms(rooms) {
        if (!this.roomSelect) return;

        // Clear existing options except the first one
        while (this.roomSelect.children.length > 1) {
            this.roomSelect.removeChild(this.roomSelect.lastChild);
        }

        rooms.forEach(room => {
            const option = JunraiUtils.createElement('option', {
                value: room.id,
                textContent: `${room.name} - ${JunraiUtils.formatCurrency(room.hourly_rate)}/ชั่วโมง (${room.capacity} ที่นั่ง)`
            });
            this.roomSelect.appendChild(option);
        });
    }

    /**
     * Handle room selection change
     */
    async handleRoomChange(event) {
        const roomId = parseInt(event.target.value);
        
        if (!roomId) {
            this.clearTimeSlots();
            return;
        }

        this.currentRoom = roomId;
        await this.loadRoomData(roomId);
        await this.loadTimeSlots();
        this.clearSelection();
    }

    /**
     * Handle date selection change
     */
    async handleDateChange(event) {
        this.selectedDate = event.target.value;
        
        if (this.currentRoom) {
            await this.loadTimeSlots();
            this.clearSelection();
        }
    }

    /**
     * Handle guest count change
     */
    handleGuestCountChange(event) {
        const guestCount = parseInt(event.target.value) || 0;
        const roomCapacity = this.roomData?.capacity || 0;

        // Validate guest count
        if (guestCount > roomCapacity) {
            this.showError(`จำนวนแขกเกินความจุห้อง (สูงสุด ${roomCapacity} คน)`);
            event.target.value = roomCapacity;
        } else if (guestCount < 1 && event.target.value) {
            this.showError('จำนวนแขกต้องมากกว่า 0 คน');
            event.target.value = 1;
        } else {
            this.hideError();
        }
    }

    /**
     * Load room data
     */
    async loadRoomData(roomId) {
        try {
            const response = await JunraiUtils.apiRequest(`/api/rooms/${roomId}`);
            
            if (response.success) {
                this.roomData = response.room;
                this.updateRoomDisplay();
                this.setupPriceCalculator();
            }
        } catch (error) {
            JunraiUtils.logError(error, 'Load room data');
            this.showError('ไม่สามารถโหลดข้อมูลห้องได้');
        }
    }

    /**
     * Load available time slots
     */
    async loadTimeSlots() {
        if (!this.currentRoom || !this.selectedDate) {
            return;
        }

        try {
            this.showLoading('กำลังโหลดช่วงเวลาที่ว่าง...');

            const response = await JunraiUtils.apiRequest(
                `/api/bookings/available-slots?room_id=${this.currentRoom}&date=${this.selectedDate}`
            );

            if (response.success) {
                this.availableSlots = response.slots;
                this.renderTimeSlots();
            } else {
                throw new Error(response.message || 'ไม่สามารถโหลดข้อมูลเวลาได้');
            }

        } catch (error) {
            JunraiUtils.logError(error, 'Load time slots');
            this.showError('เกิดข้อผิดพลาดในการโหลดช่วงเวลา');
            this.clearTimeSlots();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Render time slots grid
     */
    renderTimeSlots() {
        if (!this.timeSlotsGrid) return;

        this.timeSlotsGrid.innerHTML = '';

        if (!this.availableSlots || this.availableSlots.length === 0) {
            this.timeSlotsGrid.innerHTML = `
                <div class="no-slots-message">
                    <i class="fas fa-calendar-times"></i>
                    <h3>ไม่มีช่วงเวลาที่ว่างในวันที่เลือก</h3>
                    <p>กรุณาเลือกวันอื่นหรือห้องอื่น</p>
                </div>
            `;
            return;
        }

        // Group slots by hour for better visualization
        const slotsByHour = this.groupSlotsByHour(this.availableSlots);

        Object.keys(slotsByHour).forEach(hour => {
            const hourSection = JunraiUtils.createElement('div', {
                className: 'time-slots-hour-section'
            });

            const hourLabel = JunraiUtils.createElement('div', {
                className: 'hour-label',
                textContent: `${hour}:00`
            });

            const slotsRow = JunraiUtils.createElement('div', {
                className: 'time-slots-row'
            });

            slotsByHour[hour].forEach(slot => {
                const slotElement = this.createSlotElement(slot);
                slotsRow.appendChild(slotElement);
            });

            hourSection.appendChild(hourLabel);
            hourSection.appendChild(slotsRow);
            this.timeSlotsGrid.appendChild(hourSection);
        });
    }

    /**
     * Create time slot element
     */
    createSlotElement(slot) {
        const isSelected = this.selectedSlots.has(slot.id);
        const isDisabled = !slot.available || slot.booked;

        const slotElement = JunraiUtils.createElement('div', {
            className: `time-slot ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`,
            'data-slot-id': slot.id,
            'data-start-time': slot.start_time,
            'data-end-time': slot.end_time,
            title: this.getSlotTooltip(slot)
        });

        const timeDisplay = JunraiUtils.createElement('div', {
            className: 'slot-time',
            textContent: `${JunraiUtils.formatTime(slot.start_time)} - ${JunraiUtils.formatTime(slot.end_time)}`
        });

        const statusDisplay = JunraiUtils.createElement('div', {
            className: 'slot-status',
            innerHTML: this.getSlotStatusHTML(slot)
        });

        slotElement.appendChild(timeDisplay);
        slotElement.appendChild(statusDisplay);

        // Add click handler if slot is available
        if (!isDisabled) {
            JunraiUtils.on(slotElement, 'click', () => {
                this.toggleSlotSelection(slot);
            });
        }

        return slotElement;
    }

    /**
     * Toggle slot selection
     */
    toggleSlotSelection(slot) {
        if (this.selectedSlots.has(slot.id)) {
            this.selectedSlots.delete(slot.id);
        } else {
            this.selectedSlots.add(slot.id);
        }

        this.updateSlotUI(slot.id);
        this.updateBookingSummary();
        
        // Emit event
        JunraiUtils.emit(document, 'junrai:booking:slot-selected', {
            slotId: slot.id,
            selected: this.selectedSlots.has(slot.id),
            totalSelected: this.selectedSlots.size
        });
    }

    /**
     * Update slot UI after selection change
     */
    updateSlotUI(slotId) {
        const slotElement = JunraiUtils.findElement(`[data-slot-id="${slotId}"]`);
        if (slotElement) {
            JunraiUtils.toggleClass(slotElement, 'selected');
        }
    }

    /**
     * Update booking summary
     */
    updateBookingSummary() {
        if (!this.bookingSummary) return;

        const selectedCount = this.selectedSlots.size;
        const totalDuration = selectedCount * 1; // 1 hour per slot
        const totalPrice = this.calculateTotalPrice();

        // Update displays
        if (this.selectedSlotsDisplay) {
            this.selectedSlotsDisplay.textContent = `${selectedCount} ช่วงเวลา`;
        }

        if (this.totalDurationDisplay) {
            this.totalDurationDisplay.textContent = `${totalDuration} ชั่วโมง`;
        }

        if (this.totalPriceDisplay) {
            this.totalPriceDisplay.textContent = JunraiUtils.formatCurrency(totalPrice);
        }

        // Show/hide booking actions
        const hasSelection = selectedCount > 0;
        if (this.bookButton) {
            this.bookButton.disabled = !hasSelection;
        }

        if (this.clearButton) {
            this.clearButton.style.display = hasSelection ? '' : 'none';
        }

        // Show/hide summary
        if (this.bookingSummary) {
            this.bookingSummary.style.display = hasSelection ? '' : 'none';
        }
    }

    /**
     * Calculate total price
     */
    calculateTotalPrice() {
        if (!this.roomData || this.selectedSlots.size === 0) {
            return 0;
        }

        const basePrice = this.roomData.hourly_rate * this.selectedSlots.size;
        
        // Apply any discounts or surcharges
        let finalPrice = basePrice;

        // Weekend surcharge
        if (this.selectedDate) {
            const date = new Date(this.selectedDate);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
            
            if (isWeekend && this.roomData.weekend_surcharge) {
                finalPrice += basePrice * (this.roomData.weekend_surcharge / 100);
            }
        }

        // Multi-hour discount
        if (this.selectedSlots.size >= 3 && this.roomData.multi_hour_discount) {
            finalPrice -= basePrice * (this.roomData.multi_hour_discount / 100);
        }

        return Math.round(finalPrice);
    }

    /**
     * Handle booking submission
     */
    async handleBooking() {
        if (!this.validateBooking()) {
            return;
        }

        try {
            this.showLoading('กำลังจองห้อง...');
            
            const bookingData = this.prepareBookingData();
            const response = await JunraiUtils.apiRequest('/api/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });

            if (response.success) {
                this.handleBookingSuccess(response.booking);
            } else {
                throw new Error(response.message || 'การจองล้มเหลว');
            }

        } catch (error) {
            JunraiUtils.logError(error, 'Booking submission');
            this.showError(error.message || 'เกิดข้อผิดพลาดในการจอง');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Validate booking data
     */
    validateBooking() {
        // Check authentication
        if (!junraiAuth.isAuthenticated()) {
            this.showError('กรุณาเข้าสู่ระบบก่อนจอง');
            return false;
        }

        // Check selected slots
        if (this.selectedSlots.size === 0) {
            this.showError('กรุณาเลือกช่วงเวลาที่ต้องการจอง');
            return false;
        }

        // Check room selection
        if (!this.currentRoom) {
            this.showError('กรุณาเลือกห้อง');
            return false;
        }

        // Check date selection
        if (!this.selectedDate) {
            this.showError('กรุณาเลือกวันที่');
            return false;
        }

        // Check business hours
        if (!JunraiUtils.isBusinessOpen(new Date(this.selectedDate))) {
            this.showError('ไม่สามารถจองในวันที่เลือกได้ เนื่องจากอยู่นอกเวลาทำการ');
            return false;
        }

        // Check guest count
        const guestCount = parseInt(this.guestCountInput?.value) || 1;
        if (guestCount < 1 || guestCount > this.roomData?.capacity) {
            this.showError(`จำนวนแขกไม่ถูกต้อง (1-${this.roomData?.capacity} คน)`);
            return false;
        }

        return true;
    }

    /**
     * Prepare booking data for submission
     */
    prepareBookingData() {
        const selectedSlotIds = Array.from(this.selectedSlots);
        const guestCount = parseInt(this.guestCountInput?.value) || 1;
        const specialRequests = this.specialRequestsTextarea?.value.trim() || '';

        return {
            room_id: this.currentRoom,
            booking_date: this.selectedDate,
            time_slots: selectedSlotIds,
            guest_count: guestCount,
            special_requests: specialRequests,
            total_price: this.calculateTotalPrice()
        };
    }

    /**
     * Handle successful booking
     */
    handleBookingSuccess(booking) {
        // Show success message
        if (window.JunraiUtils.showToast) {
            window.JunraiUtils.showToast(
                'จองห้องสำเร็จ! คุณจะได้รับอีเมลยืนยันในไม่ช้า',
                'success',
                5000
            );
        }

        // Emit success event
        JunraiUtils.emit(document, 'junrai:booking:success', { booking });

        // Redirect to booking confirmation or dashboard
        setTimeout(() => {
            window.location.href = `/bookings/${booking.id}`;
        }, 2000);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedSlots.clear();
        
        // Update UI
        JunraiUtils.findElements('.time-slot.selected').forEach(slot => {
            JunraiUtils.removeClass(slot, 'selected');
        });

        this.updateBookingSummary();
        
        // Emit event
        JunraiUtils.emit(document, 'junrai:booking:selection-cleared');
    }

    /**
     * Refresh time slots
     */
    async refreshTimeSlots() {
        if (this.currentRoom && this.selectedDate) {
            await this.loadTimeSlots();
            this.clearSelection();
        }
    }

    /**
     * Utility methods
     */
    groupSlotsByHour(slots) {
        return slots.reduce((groups, slot) => {
            const hour = new Date(slot.start_time).getHours();
            if (!groups[hour]) {
                groups[hour] = [];
            }
            groups[hour].push(slot);
            return groups;
        }, {});
    }

    getSlotTooltip(slot) {
        if (!slot.available) {
            return 'ช่วงเวลานี้ไม่พร้อมใช้งาน';
        }
        if (slot.booked) {
            return 'ช่วงเวลานี้ถูกจองแล้ว';
        }
        return `คลิกเพื่อเลือกช่วงเวลา ${JunraiUtils.formatTime(slot.start_time)} - ${JunraiUtils.formatTime(slot.end_time)}`;
    }

    getSlotStatusHTML(slot) {
        if (slot.booked) {
            return '<i class="fas fa-lock"></i> จองแล้ว';
        }
        if (!slot.available) {
            return '<i class="fas fa-times"></i> ไม่ว่าง';
        }
        return '<i class="fas fa-check"></i> ว่าง';
    }

    updateRoomDisplay() {
        if (!this.roomInfoDisplay || !this.roomData) return;

        this.roomInfoDisplay.innerHTML = `
            <div class="room-info-card">
                <h3>${this.roomData.name}</h3>
                <div class="room-details">
                    <div class="room-detail">
                        <i class="fas fa-users"></i>
                        <span>ความจุ: ${this.roomData.capacity} คน</span>
                    </div>
                    <div class="room-detail">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>ราคา: ${JunraiUtils.formatCurrency(this.roomData.hourly_rate)}/ชั่วโมง</span>
                    </div>
                    ${this.roomData.description ? `
                        <div class="room-detail">
                            <i class="fas fa-info-circle"></i>
                            <span>${this.roomData.description}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    clearTimeSlots() {
        if (this.timeSlotsGrid) {
            this.timeSlotsGrid.innerHTML = '';
        }
        this.availableSlots = [];
        this.clearSelection();
    }

    setupPriceCalculator() {
        if (!this.roomData) return;
        
        this.priceCalculator = {
            baseRate: this.roomData.hourly_rate,
            weekendSurcharge: this.roomData.weekend_surcharge || 0,
            multiHourDiscount: this.roomData.multi_hour_discount || 0
        };
    }

    handleFormSubmit(event) {
        event.preventDefault();
        this.handleBooking();
    }

    showLoading(message = 'กำลังโหลด...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            const loadingText = this.loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        if (this.errorDisplay) {
            this.errorDisplay.textContent = message;
            this.errorDisplay.style.display = 'block';
        }

        if (window.JunraiUtils.showToast) {
            window.JunraiUtils.showToast(message, 'error', 4000);
        }
    }

    hideError() {
        if (this.errorDisplay) {
            this.errorDisplay.style.display = 'none';
        }
    }
}

// Initialize booking system
let junraiBooking;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        junraiBooking = new JunraiBooking();
    });
} else {
    junraiBooking = new JunraiBooking();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JunraiBooking;
}

// Make available globally
window.JunraiBooking = JunraiBooking;
window.junraiBooking = junraiBooking;