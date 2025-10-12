/**
 * Booking Module
 * Handles room booking functionality and booking management
 */

import { $, $$, on } from '../core/dom.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/api.js';
import { emit, showToast } from '../core/events.js';

/**
 * Initialize booking page functionality
 * @returns {void}
 */
export function initBookingPage() {
    const bookingModule = new BookingModule();
    bookingModule.init();
}

class BookingModule {
    constructor() {
        this.bookings = [];
        this.rooms = [];
        this.currentBooking = null;
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.loadInitialData();
        
        this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submissions
        window.EventBus.on('form:submit', (event) => {
            const { module, action, form, originalEvent } = event.data;
            
            if (module === 'booking') {
                originalEvent.preventDefault();
                
                switch (action) {
                    case 'create':
                        this.handleCreateBooking(form);
                        break;
                    case 'update':
                        this.handleUpdateBooking(form);
                        break;
                    case 'cancel':
                        this.handleCancelBooking(form);
                        break;
                }
            }
        });

        // UI actions
        window.EventBus.on('ui:action', (event) => {
            const { action, element, data } = event.data;
            
            switch (action) {
                case 'book-room':
                    this.startBooking(data.roomId);
                    break;
                case 'view-booking':
                    this.viewBooking(data.bookingId);
                    break;
                case 'edit-booking':
                    this.editBooking(data.bookingId);
                    break;
                case 'cancel-booking':
                    this.cancelBooking(data.bookingId);
                    break;
                case 'load-bookings':
                    this.loadUserBookings();
                    break;
                case 'select-room':
                    this.selectRoom(data.roomId);
                    break;
                case 'calculate-price':
                    this.calculatePrice();
                    break;
            }
        });

        // Input validation for booking forms
        window.EventBus.on('input:validate', (event) => {
            const { type, input, value } = event.data;
            
            switch (type) {
                case 'booking-date':
                    this.validateBookingDate(input, value);
                    break;
                case 'booking-time':
                    this.validateBookingTime(input, value);
                    break;
                case 'duration':
                    this.validateDuration(input, value);
                    break;
            }
        });
    }

    /**
     * Load initial data (rooms, user bookings)
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadRooms(),
                this.loadUserBookings()
            ]);
        } catch (error) {
            console.error('Error loading initial booking data:', error);
        }
    }

    /**
     * Load available rooms
     */
    async loadRooms() {
        try {
            const response = await window.API.get('/rooms');
            this.rooms = response;
            
            this.renderRoomList();
            window.EventBus.emit('booking:rooms-loaded', { rooms: this.rooms });
            
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showError('ไม่สามารถโหลดข้อมูลห้องได้');
        }
    }

    /**
     * Load user bookings
     */
    async loadUserBookings() {
        if (!window.Auth.isAuthenticated()) return;
        
        try {
            const response = await window.API.get('/bookings');
            this.bookings = response.bookings || response;
            
            this.renderBookingsList();
            window.EventBus.emit('booking:bookings-loaded', { bookings: this.bookings });
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('ไม่สามารถโหลดข้อมูลการจองได้');
        }
    }

    /**
     * Start booking process for a room
     */
    async startBooking(roomId) {
        if (!window.Auth.isAuthenticated()) {
            window.EventBus.emit('toast:show', { 
                message: 'กรุณาเข้าสู่ระบบก่อนทำการจอง', 
                type: 'warning' 
            });
            window.location.href = '/auth';
            return;
        }

        try {
            // Get room details
            const room = this.rooms.find(r => r.room_id == roomId);
            if (!room) {
                const roomResponse = await window.API.get(`/rooms/${roomId}`);
                this.currentRoom = roomResponse;
            } else {
                this.currentRoom = room;
            }
            
            // Redirect to booking page or show booking modal
            const currentPath = window.location.pathname;
            if (currentPath === '/bookings') {
                this.showBookingForm();
            } else {
                window.location.href = `/bookings?room=${roomId}`;
            }
            
        } catch (error) {
            console.error('Error starting booking:', error);
            this.showError('ไม่สามารถเริ่มการจองได้');
        }
    }

    /**
     * Handle create booking form submission
     */
    async handleCreateBooking(form) {
        const formData = window.DOM.getFormData(form);
        
        // Validate form data
        if (!this.validateBookingForm(formData)) {
            return;
        }

        this.showLoading(true);

        try {
            const bookingData = this.prepareBookingData(formData);
            const response = await window.API.post('/bookings', bookingData);
            
            this.showSuccess('จองห้องสำเร็จ!');
            
            // Redirect to payment or booking details
            setTimeout(() => {
                if (response.booking_id) {
                    window.location.href = `/payment?booking=${response.booking_id}`;
                } else {
                    this.loadUserBookings();
                }
            }, 1500);
            
        } catch (error) {
            console.error('Booking creation error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการจอง');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle booking cancellation
     */
    async cancelBooking(bookingId) {
        if (!confirm('คุณต้องการยกเลิกการจองนี้หรือไม่?')) {
            return;
        }

        try {
            await window.API.delete(`/bookings/${bookingId}`);
            
            this.showSuccess('ยกเลิกการจองเรียบร้อยแล้ว');
            this.loadUserBookings();
            
        } catch (error) {
            console.error('Booking cancellation error:', error);
            this.showError(error.message || 'ไม่สามารถยกเลิกการจองได้');
        }
    }

    /**
     * View booking details
     */
    async viewBooking(bookingId) {
        try {
            const response = await window.API.get(`/bookings/${bookingId}`);
            this.currentBooking = response.booking || response;
            
            this.showBookingDetails(this.currentBooking);
            
        } catch (error) {
            console.error('Error viewing booking:', error);
            this.showError('ไม่สามารถดูรายละเอียดการจองได้');
        }
    }

    /**
     * Render room list
     */
    renderRoomList() {
        const container = window.DOM.$('#roomsList') || window.DOM.$('#popularRooms');
        if (!container) return;

        if (this.rooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed"></i>
                    <h3>ไม่มีห้องว่าง</h3>
                    <p>ขณะนี้ไม่มีห้องว่างให้บริการ</p>
                </div>
            `;
            return;
        }

        const roomsHTML = this.rooms
            .filter(room => room.status === 'available')
            .map(room => this.renderRoomCard(room))
            .join('');

        container.innerHTML = roomsHTML;
    }

    /**
     * Render individual room card
     */
    renderRoomCard(room) {
        const priceDisplay = room.price_per_hour ? 
            `฿${room.price_per_hour}/ชม.` : 'ติดต่อเรา';

        return `
            <div class="room-card" data-room-id="${room.room_id}">
                <div class="room-header">
                    <div class="room-status available">
                        <i class="fas fa-check-circle"></i>
                        ว่าง
                    </div>
                    <div class="room-price">${priceDisplay}</div>
                </div>
                
                <div class="room-body">
                    <h4 class="room-name">
                        <i class="fas fa-door-open"></i>
                        ${room.name}
                    </h4>
                    
                    <div class="room-info">
                        <div class="info-item">
                            <i class="fas fa-tags"></i>
                            <span>${room.type_name || 'ไม่ระบุประเภท'}</span>
                        </div>
                        
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${room.capacity || 'ไม่ระบุ'} คน</span>
                        </div>
                    </div>
                </div>
                
                <div class="room-footer">
                    <button class="btn btn-primary" 
                            data-action="book-room" 
                            data-room-id="${room.room_id}">
                        <i class="fas fa-calendar-plus"></i>
                        จองห้อง
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render bookings list
     */
    renderBookingsList() {
        const container = window.DOM.$('#bookingsContainer');
        if (!container) return;

        const loading = window.DOM.$('#bookingsLoading');
        if (loading) window.DOM.hide(loading);

        if (this.bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>ไม่มีการจอง</h3>
                    <p>คุณยังไม่มีการจองใดๆ</p>
                    <a href="/rooms" class="btn btn-primary">
                        <i class="fas fa-door-open"></i>
                        ดูห้องคาราโอเกะ
                    </a>
                </div>
            `;
            return;
        }

        const bookingsHTML = this.bookings
            .map(booking => this.renderBookingCard(booking))
            .join('');

        container.innerHTML = bookingsHTML;
    }

    /**
     * Render individual booking card
     */
    renderBookingCard(booking) {
        const statusClass = this.getBookingStatusClass(booking.status);
        const statusText = this.getBookingStatusText(booking.status);
        const date = new Date(booking.booking_date).toLocaleDateString('th-TH');
        const startTime = booking.start_time.substring(0, 5);
        const endTime = booking.end_time.substring(0, 5);

        return `
            <div class="booking-card ${statusClass}">
                <div class="booking-header">
                    <div class="booking-status">
                        <i class="fas ${this.getBookingStatusIcon(booking.status)}"></i>
                        ${statusText}
                    </div>
                    <div class="booking-id">#${booking.booking_id}</div>
                </div>
                
                <div class="booking-body">
                    <h4 class="booking-room">${booking.room_name || 'ห้อง ' + booking.room_id}</h4>
                    
                    <div class="booking-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${date}</span>
                        </div>
                        
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${startTime} - ${endTime}</span>
                        </div>
                        
                        <div class="detail-item">
                            <i class="fas fa-money-bill"></i>
                            <span>฿${booking.total_price}</span>
                        </div>
                    </div>
                </div>
                
                <div class="booking-actions">
                    <button class="btn btn-outline btn-sm" 
                            data-action="view-booking" 
                            data-booking-id="${booking.booking_id}">
                        <i class="fas fa-eye"></i>
                        ดูรายละเอียด
                    </button>
                    
                    ${booking.status === 'pending' ? `
                        <button class="btn btn-danger btn-sm" 
                                data-action="cancel-booking" 
                                data-booking-id="${booking.booking_id}">
                            <i class="fas fa-times"></i>
                            ยกเลิก
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Validate booking form data
     */
    validateBookingForm(formData) {
        const errors = [];
        
        if (!formData.room_id) {
            errors.push('กรุณาเลือกห้อง');
        }
        
        if (!formData.booking_date) {
            errors.push('กรุณาเลือกวันที่');
        }
        
        if (!formData.start_time) {
            errors.push('กรุณาเลือกเวลาเริ่มต้น');
        }
        
        if (!formData.end_time) {
            errors.push('กรุณาเลือกเวลาสิ้นสุด');
        }
        
        if (formData.start_time && formData.end_time) {
            if (formData.start_time >= formData.end_time) {
                errors.push('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
            }
        }
        
        if (errors.length > 0) {
            this.showError(errors.join('<br>'));
            return false;
        }
        
        return true;
    }

    /**
     * Prepare booking data for API
     */
    prepareBookingData(formData) {
        return {
            room_id: parseInt(formData.room_id),
            booking_date: formData.booking_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes || ''
        };
    }

    /**
     * Calculate booking price
     */
    async calculatePrice() {
        const roomSelect = window.DOM.$('#roomSelect');
        const startTime = window.DOM.$('#startTime');
        const endTime = window.DOM.$('#endTime');
        const priceDisplay = window.DOM.$('#priceDisplay');
        
        if (!roomSelect || !startTime || !endTime || !priceDisplay) return;
        
        const roomId = roomSelect.value;
        const start = startTime.value;
        const end = endTime.value;
        
        if (!roomId || !start || !end) {
            priceDisplay.textContent = '฿0';
            return;
        }
        
        try {
            const room = this.rooms.find(r => r.room_id == roomId);
            if (!room || !room.price_per_hour) {
                priceDisplay.textContent = 'ติดต่อเรา';
                return;
            }
            
            const startHour = parseInt(start.split(':')[0]);
            const startMinute = parseInt(start.split(':')[1]);
            const endHour = parseInt(end.split(':')[0]);
            const endMinute = parseInt(end.split(':')[1]);
            
            const durationHours = (endHour + endMinute/60) - (startHour + startMinute/60);
            
            if (durationHours <= 0) {
                priceDisplay.textContent = '฿0';
                return;
            }
            
            const totalPrice = Math.ceil(durationHours * room.price_per_hour);
            priceDisplay.textContent = `฿${totalPrice}`;
            
        } catch (error) {
            console.error('Error calculating price:', error);
            priceDisplay.textContent = 'ไม่สามารถคำนวณได้';
        }
    }

    /**
     * Get booking status CSS class
     */
    getBookingStatusClass(status) {
        const classes = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        };
        return classes[status] || 'status-unknown';
    }

    /**
     * Get booking status text
     */
    getBookingStatusText(status) {
        const texts = {
            pending: 'รอชำระเงิน',
            confirmed: 'ยืนยันแล้ว',
            completed: 'เสร็จสิ้น',
            cancelled: 'ยกเลิกแล้ว'
        };
        return texts[status] || 'ไม่ทราบสถานะ';
    }

    /**
     * Get booking status icon
     */
    getBookingStatusIcon(status) {
        const icons = {
            pending: 'fa-clock',
            confirmed: 'fa-check-circle',
            completed: 'fa-check-double',
            cancelled: 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const overlay = window.DOM.$('#loadingOverlay');
        if (overlay) {
            window.DOM[show ? 'show' : 'hide'](overlay, 'flex');
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
}

// Create global instance
window.Booking = new BookingModule();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingModule;
}