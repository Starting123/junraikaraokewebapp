/**
 * ==========================================
 * Cinema-Style Time Slot Manager
 * Handles time slot selection, booking UI, and real-time updates
 * ==========================================
 */

class CinemaTimeslotManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
        
        // Configuration
        this.options = {
            apiBase: '/api',
            autoRefresh: true,
            refreshInterval: 30000, // 30 seconds
            dateFormat: 'th-TH',
            maxSlotsPerRow: 6,
            showLegend: true,
            allowMultiSelect: false,
            ...options
        };
        
        // State
        this.currentRoom = null;
        this.currentDate = null;
        this.selectedSlots = new Set();
        this.availableRooms = [];
        this.timeslots = [];
        this.isLoading = false;
        this.refreshTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadRooms = this.loadRooms.bind(this);
        this.loadTimeslots = this.loadTimeslots.bind(this);
        this.selectSlot = this.selectSlot.bind(this);
        this.refreshTimeslots = this.refreshTimeslots.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the cinema timeslot system
     */
    async init() {
        try {
            this.renderContainer();
            await this.loadRooms();
            this.bindEvents();
            this.setDefaultDate();
            
            if (this.options.autoRefresh) {
                this.startAutoRefresh();
            }
        } catch (error) {
            console.error('Failed to initialize cinema timeslot manager:', error);
            this.showError('Failed to load booking system');
        }
    }
    
    /**
     * Render the main container structure
     */
    renderContainer() {
        this.container.innerHTML = `
            <div class="cinema-booking-container">
                <!-- Header -->
                <div class="cinema-header">
                    <h2 class="cinema-title">
                        <i class="fas fa-film"></i>
                        Select Your Time Slot
                    </h2>
                    <p class="cinema-subtitle">Choose your preferred date, room, and time</p>
                </div>
                
                <!-- Controls -->
                <div class="cinema-controls">
                    <div class="control-group">
                        <label class="control-label">
                            <i class="fas fa-calendar-alt"></i> Select Date
                        </label>
                        <input type="date" id="cinema-date" class="cinema-date-input">
                    </div>
                    <div class="control-group">
                        <label class="control-label">
                            <i class="fas fa-door-open"></i> Select Room
                        </label>
                        <select id="cinema-room" class="cinema-select">
                            <option value="">Loading rooms...</option>
                        </select>
                    </div>
                </div>
                
                <!-- Room Info Display -->
                <div id="room-info-display" class="room-info-cinema" style="display: none;">
                    <!-- Room details will be rendered here -->
                </div>
                
                <!-- Cinema Screen Indicator -->
                <div class="cinema-screen">
                    <div class="screen-label">
                        <i class="fas fa-tv"></i> Available Time Slots
                    </div>
                </div>
                
                <!-- Timeslots Grid -->
                <div id="timeslots-container" class="timeslots-grid">
                    <div class="cinema-loading">
                        <div class="cinema-spinner"></div>
                        <p>Select a date and room to view available time slots</p>
                    </div>
                </div>
                
                <!-- Legend -->
                <div class="cinema-legend" ${!this.options.showLegend ? 'style="display: none;"' : ''}>
                    <div class="legend-item">
                        <div class="legend-color available"></div>
                        <span>Available</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color booked"></div>
                        <span>Booked</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color selected"></div>
                        <span>Selected</span>
                    </div>
                </div>
                
                <!-- Selection Summary -->
                <div id="selection-summary" style="display: none;">
                    <!-- Selection details will be rendered here -->
                </div>
            </div>
        `;
    }
    
    /**
     * Load available rooms
     */
    async loadRooms() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.options.apiBase}/rooms`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load rooms');
            
            const data = await response.json();
            this.availableRooms = data.data.rooms || [];
            this.renderRoomOptions();
        } catch (error) {
            console.error('Failed to load rooms:', error);
            this.showError('Failed to load rooms');
        }
    }
    
    /**
     * Render room options in select element
     */
    renderRoomOptions() {
        const roomSelect = document.getElementById('cinema-room');
        
        if (this.availableRooms.length === 0) {
            roomSelect.innerHTML = '<option value="">No rooms available</option>';
            return;
        }
        
        const optionsHTML = [
            '<option value="">Choose a room...</option>',
            ...this.availableRooms.map(room => 
                `<option value="${room.room_id}" data-room='${JSON.stringify(room)}'>
                    ${room.name} - ${room.type_name} (${room.price_per_hour}฿/hr)
                </option>`
            )
        ].join('');
        
        roomSelect.innerHTML = optionsHTML;
    }
    
    /**
     * Load timeslots for selected room and date
     */
    async loadTimeslots(roomId, date) {
        if (!roomId || !date) {
            this.renderEmptyState('Please select both a room and date');
            return;
        }
        
        this.isLoading = true;
        this.renderLoadingState();
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.options.apiBase}/timeslots/${roomId}/${date}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load timeslots');
            
            const data = await response.json();
            this.timeslots = data.data.slots || [];
            this.currentRoom = data.data.room;
            this.currentDate = date;
            
            this.renderRoomInfo();
            this.renderTimeslots();
            
        } catch (error) {
            console.error('Failed to load timeslots:', error);
            this.showError('Failed to load time slots');
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Render room information
     */
    renderRoomInfo() {
        const roomInfoDisplay = document.getElementById('room-info-display');
        
        if (!this.currentRoom) {
            roomInfoDisplay.style.display = 'none';
            return;
        }
        
        roomInfoDisplay.innerHTML = `
            <div class="room-info-header">
                <h3 class="room-name-cinema">
                    <i class="fas fa-door-open"></i>
                    ${this.currentRoom.name}
                </h3>
                <div class="room-price-cinema">
                    ${this.currentRoom.price_per_hour}฿/hour
                </div>
            </div>
            <div class="room-details-cinema">
                <div class="room-detail-item">
                    <i class="fas fa-users"></i>
                    <span>Capacity: ${this.currentRoom.capacity} people</span>
                </div>
                <div class="room-detail-item">
                    <i class="fas fa-tag"></i>
                    <span>Type: ${this.currentRoom.type_name}</span>
                </div>
                <div class="room-detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Hours: ${this.currentRoom.open_time} - ${this.currentRoom.close_time}</span>
                </div>
                <div class="room-detail-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>Date: ${new Date(this.currentDate).toLocaleDateString(this.options.dateFormat)}</span>
                </div>
            </div>
        `;
        
        roomInfoDisplay.style.display = 'block';
    }
    
    /**
     * Render timeslots grid
     */
    renderTimeslots() {
        const container = document.getElementById('timeslots-container');
        
        if (!this.timeslots || this.timeslots.length === 0) {
            this.renderEmptyState('No time slots available for this date');
            return;
        }
        
        const slotsHTML = this.timeslots.map((slot, index) => {
            const isSelected = this.selectedSlots.has(slot.slot_id);
            const statusClass = slot.available ? 'available' : 'booked';
            const selectedClass = isSelected ? 'selected' : '';
            
            return `
                <button 
                    class="timeslot-btn ${statusClass} ${selectedClass}"
                    data-slot-id="${slot.slot_id}"
                    data-slot='${JSON.stringify(slot)}'
                    ${!slot.available ? 'disabled' : ''}
                    title="${slot.available ? 'Click to select this time slot' : 'This time slot is already booked'}"
                    style="animation-delay: ${index * 0.05}s"
                >
                    <span class="slot-time">${slot.formatted_time}</span>
                    ${slot.booking_info ? `<small class="slot-booker">${slot.booking_info.user_name}</small>` : ''}
                </button>
            `;
        }).join('');
        
        container.innerHTML = slotsHTML;
        
        // Update summary if there are selections
        if (this.selectedSlots.size > 0) {
            this.renderSelectionSummary();
        }
    }
    
    /**
     * Render loading state
     */
    renderLoadingState() {
        const container = document.getElementById('timeslots-container');
        container.innerHTML = `
            <div class="cinema-loading">
                <div class="cinema-spinner"></div>
                <p>Loading available time slots...</p>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState(message = 'No time slots available') {
        const container = document.getElementById('timeslots-container');
        container.innerHTML = `
            <div class="cinema-empty">
                <i class="fas fa-calendar-times"></i>
                <h3>No Time Slots Available</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    /**
     * Handle slot selection
     */
    selectSlot(slotId, slotData) {
        if (!slotData.available) return;
        
        // Handle single/multi selection
        if (!this.options.allowMultiSelect) {
            this.selectedSlots.clear();
        }
        
        if (this.selectedSlots.has(slotId)) {
            this.selectedSlots.delete(slotId);
        } else {
            this.selectedSlots.add(slotId);
        }
        
        // Update UI
        this.updateSlotButtons();
        this.renderSelectionSummary();
        
        // Emit selection event
        this.emitEvent('slotSelected', {
            selectedSlots: Array.from(this.selectedSlots),
            slotData: this.getSelectedSlotData()
        });
    }
    
    /**
     * Update slot button states
     */
    updateSlotButtons() {
        const buttons = document.querySelectorAll('.timeslot-btn');
        buttons.forEach(button => {
            const slotId = button.dataset.slotId;
            const isSelected = this.selectedSlots.has(slotId);
            
            button.classList.toggle('selected', isSelected);
        });
    }
    
    /**
     * Render selection summary
     */
    renderSelectionSummary() {
        const summaryElement = document.getElementById('selection-summary');
        
        if (this.selectedSlots.size === 0) {
            summaryElement.style.display = 'none';
            return;
        }
        
        const selectedData = this.getSelectedSlotData();
        const totalPrice = selectedData.length * this.currentRoom.price_per_hour;
        
        summaryElement.innerHTML = `
            <div class="selection-summary-cinema">
                <h3>
                    <i class="fas fa-ticket-alt"></i>
                    Booking Summary
                </h3>
                <div class="summary-details">
                    <div class="summary-item">
                        <span>Room:</span>
                        <span>${this.currentRoom.name}</span>
                    </div>
                    <div class="summary-item">
                        <span>Date:</span>
                        <span>${new Date(this.currentDate).toLocaleDateString(this.options.dateFormat)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Time Slots:</span>
                        <span>${selectedData.map(slot => slot.formatted_time).join(', ')}</span>
                    </div>
                    <div class="summary-item total">
                        <span>Total Price:</span>
                        <span>${totalPrice}฿</span>
                    </div>
                </div>
            </div>
        `;
        
        summaryElement.style.display = 'block';
    }
    
    /**
     * Get selected slot data
     */
    getSelectedSlotData() {
        return this.timeslots.filter(slot => this.selectedSlots.has(slot.slot_id));
    }
    
    /**
     * Set default date to today
     */
    setDefaultDate() {
        const dateInput = document.getElementById('cinema-date');
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateInput.value = formattedDate;
        dateInput.min = formattedDate; // Prevent past dates
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Date selection
        document.getElementById('cinema-date').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            if (this.currentRoom) {
                this.loadTimeslots(this.currentRoom.room_id, this.currentDate);
            }
        });
        
        // Room selection
        document.getElementById('cinema-room').addEventListener('change', (e) => {
            const option = e.target.selectedOptions[0];
            if (option.value) {
                this.currentRoom = JSON.parse(option.dataset.room);
                if (this.currentDate) {
                    this.loadTimeslots(this.currentRoom.room_id, this.currentDate);
                }
            } else {
                this.currentRoom = null;
                this.renderEmptyState('Please select a room');
            }
        });
        
        // Slot selection (Event Delegation)
        document.getElementById('timeslots-container').addEventListener('click', (e) => {
            const button = e.target.closest('.timeslot-btn');
            if (button && !button.disabled) {
                const slotId = button.dataset.slotId;
                const slotData = JSON.parse(button.dataset.slot);
                this.selectSlot(slotId, slotData);
            }
        });
    }
    
    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            if (this.currentRoom && this.currentDate && !this.isLoading) {
                this.refreshTimeslots();
            }
        }, this.options.refreshInterval);
    }
    
    /**
     * Refresh timeslots without changing selections
     */
    async refreshTimeslots() {
        if (!this.currentRoom || !this.currentDate) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.options.apiBase}/timeslots/${this.currentRoom.room_id}/${this.currentDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            const newTimeslots = data.data.slots || [];
            
            // Check if any selected slots are now booked
            const nowBooked = Array.from(this.selectedSlots).filter(slotId => {
                const newSlot = newTimeslots.find(s => s.slot_id === slotId);
                return newSlot && !newSlot.available;
            });
            
            if (nowBooked.length > 0) {
                // Remove newly booked slots from selection
                nowBooked.forEach(slotId => this.selectedSlots.delete(slotId));
                this.showNotification('Some selected time slots are no longer available', 'warning');
            }
            
            this.timeslots = newTimeslots;
            this.renderTimeslots();
            
        } catch (error) {
            console.error('Failed to refresh timeslots:', error);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `cinema-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to container
        this.container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
    
    /**
     * Emit custom events
     */
    emitEvent(eventName, data) {
        const event = new CustomEvent(`cinema:${eventName}`, {
            detail: data,
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * Public API methods
     */
    
    getSelectedSlots() {
        return {
            slotIds: Array.from(this.selectedSlots),
            slotData: this.getSelectedSlotData(),
            room: this.currentRoom,
            date: this.currentDate
        };
    }
    
    clearSelection() {
        this.selectedSlots.clear();
        this.updateSlotButtons();
        this.renderSelectionSummary();
    }
    
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.container.innerHTML = '';
    }
    
    refresh() {
        if (this.currentRoom && this.currentDate) {
            this.loadTimeslots(this.currentRoom.room_id, this.currentDate);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CinemaTimeslotManager;
}