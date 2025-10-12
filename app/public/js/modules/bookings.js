// bookings.js - Bookings Management JavaScript
(function() {
    'use strict';
    
    let bookingsManager;
    
    class BookingsManager {
        constructor() {
            this.bookings = [];
            this.filteredBookings = [];
            this.currentFilters = {
                status: 'all',
                dateRange: 'all'
            };
            this.init();
        }
        
        init() {
            this.loadBookings();
            this.setupEventListeners();
            this.setupFilters();
        }
        
        setupEventListeners() {
            // Booking action buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('.btn-view') || e.target.closest('.btn-view')) {
                    const bookingId = e.target.dataset.bookingId || e.target.closest('.btn-view').dataset.bookingId;
                    this.viewBooking(bookingId);
                }
                
                if (e.target.matches('.btn-edit') || e.target.closest('.btn-edit')) {
                    const bookingId = e.target.dataset.bookingId || e.target.closest('.btn-edit').dataset.bookingId;
                    this.editBooking(bookingId);
                }
                
                if (e.target.matches('.btn-cancel') || e.target.closest('.btn-cancel')) {
                    const bookingId = e.target.dataset.bookingId || e.target.closest('.btn-cancel').dataset.bookingId;
                    this.cancelBooking(bookingId);
                }
            });
            
            // Filter controls
            const filterForm = document.getElementById('booking-filters');
            if (filterForm) {
                filterForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.applyFilters();
                });
            }
            
            // Clear filters
            const clearBtn = document.getElementById('clear-filters');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearFilters();
                });
            }
        }
        
        setupFilters() {
            const statusFilter = document.getElementById('status-filter');
            const dateFilter = document.getElementById('date-filter');
            
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.currentFilters.status = e.target.value;
                    this.applyFilters();
                });
            }
            
            if (dateFilter) {
                dateFilter.addEventListener('change', (e) => {
                    this.currentFilters.dateRange = e.target.value;
                    this.applyFilters();
                });
            }
        }
        
        async loadBookings() {
            try {
                const response = await fetch('/api/bookings', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (response.ok) {
                    this.bookings = await response.json();
                    this.filteredBookings = [...this.bookings];
                    this.renderBookings();
                    this.updateSummary();
                } else {
                    throw new Error('Failed to load bookings');
                }
            } catch (error) {
                console.error('Failed to load bookings:', error);
                this.showError('ไม่สามารถโหลดข้อมูลการจองได้');
            }
        }
        
        applyFilters() {
            this.filteredBookings = this.bookings.filter(booking => {
                // Status filter
                if (this.currentFilters.status !== 'all' && booking.status !== this.currentFilters.status) {
                    return false;
                }
                
                // Date range filter
                if (this.currentFilters.dateRange !== 'all') {
                    const bookingDate = new Date(booking.booking_date);
                    const now = new Date();
                    
                    switch (this.currentFilters.dateRange) {
                        case 'today':
                            if (!this.isSameDay(bookingDate, now)) return false;
                            break;
                        case 'week':
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            if (bookingDate < weekAgo) return false;
                            break;
                        case 'month':
                            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            if (bookingDate < monthAgo) return false;
                            break;
                    }
                }
                
                return true;
            });
            
            this.renderBookings();
            this.updateSummary();
        }
        
        clearFilters() {
            this.currentFilters = {
                status: 'all',
                dateRange: 'all'
            };
            
            const statusFilter = document.getElementById('status-filter');
            const dateFilter = document.getElementById('date-filter');
            
            if (statusFilter) statusFilter.value = 'all';
            if (dateFilter) dateFilter.value = 'all';
            
            this.applyFilters();
        }
        
        renderBookings() {
            const tableBody = document.querySelector('.bookings-table tbody');
            if (!tableBody) return;
            
            if (this.filteredBookings.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <i class="fas fa-calendar-times"></i>
                            <h3>ไม่พบการจอง</h3>
                            <p>คุณยังไม่มีการจองหรือไม่พบการจองที่ตรงกับเงื่อนไขการค้นหา</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const bookingsHTML = this.filteredBookings.map(booking => this.getBookingRowHTML(booking)).join('');
            tableBody.innerHTML = bookingsHTML;
        }
        
        getBookingRowHTML(booking) {
            const statusClass = `status-${booking.status}`;
            const statusText = {
                'confirmed': 'ยืนยันแล้ว',
                'pending': 'รอยืนยัน',
                'cancelled': 'ยกเลิกแล้ว',
                'completed': 'เสร็จสิ้น'
            }[booking.status] || booking.status;
            
            const bookingDate = new Date(booking.booking_date).toLocaleDateString('th-TH');
            const startTime = booking.start_time;
            const endTime = booking.end_time;
            const totalAmount = parseFloat(booking.total_amount || 0).toFixed(2);
            
            return `
                <tr>
                    <td>#${booking.booking_id}</td>
                    <td>${booking.room_name || 'N/A'}</td>
                    <td>${bookingDate}</td>
                    <td>${startTime} - ${endTime}</td>
                    <td>
                        <span class="booking-status ${statusClass}">${statusText}</span>
                    </td>
                    <td>฿${totalAmount}</td>
                    <td>
                        <div class="booking-actions">
                            <button class="action-btn-small btn-view" data-booking-id="${booking.booking_id}" title="ดูรายละเอียด">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${booking.status === 'pending' || booking.status === 'confirmed' ? `
                                <button class="action-btn-small btn-edit" data-booking-id="${booking.booking_id}" title="แก้ไข">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn-small btn-cancel" data-booking-id="${booking.booking_id}" title="ยกเลิก">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }
        
        updateSummary() {
            const totalBookings = this.filteredBookings.length;
            const confirmedBookings = this.filteredBookings.filter(b => b.status === 'confirmed').length;
            const pendingBookings = this.filteredBookings.filter(b => b.status === 'pending').length;
            const totalAmount = this.filteredBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
            
            // Update summary cards
            this.updateSummaryCard('total-bookings', totalBookings);
            this.updateSummaryCard('confirmed-bookings', confirmedBookings);
            this.updateSummaryCard('pending-bookings', pendingBookings);
            this.updateSummaryCard('total-amount', `฿${totalAmount.toFixed(2)}`);
        }
        
        updateSummaryCard(cardId, value) {
            const card = document.getElementById(cardId);
            if (card) {
                const numberElement = card.querySelector('.summary-number');
                if (numberElement) {
                    numberElement.textContent = value;
                }
            }
        }
        
        async viewBooking(bookingId) {
            try {
                const response = await fetch(`/api/bookings/${bookingId}`);
                if (response.ok) {
                    const booking = await response.json();
                    this.showBookingModal(booking);
                } else {
                    throw new Error('Failed to load booking details');
                }
            } catch (error) {
                console.error('Failed to view booking:', error);
                this.showError('ไม่สามารถโหลดรายละเอียดการจองได้');
            }
        }
        
        editBooking(bookingId) {
            window.location.href = `/bookings/edit/${bookingId}`;
        }
        
        async cancelBooking(bookingId) {
            if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) {
                return;
            }
            
            try {
                const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (response.ok) {
                    this.showSuccess('ยกเลิกการจองเรียบร้อยแล้ว');
                    this.loadBookings(); // Reload bookings
                } else {
                    throw new Error('Failed to cancel booking');
                }
            } catch (error) {
                console.error('Failed to cancel booking:', error);
                this.showError('ไม่สามารถยกเลิกการจองได้');
            }
        }
        
        showBookingModal(booking) {
            // Implementation for booking detail modal
            console.log('Show booking modal:', booking);
            // This would show a modal with booking details
        }
        
        isSameDay(date1, date2) {
            return date1.getDate() === date2.getDate() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getFullYear() === date2.getFullYear();
        }
        
        showSuccess(message) {
            if (window.showToast) {
                window.showToast(message, 'success');
            } else {
                alert(message);
            }
        }
        
        showError(message) {
            if (window.showToast) {
                window.showToast(message, 'error');
            } else {
                alert(message);
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bookingsManager = new BookingsManager();
        });
    } else {
        bookingsManager = new BookingsManager();
    }
    
    // Export for global access
    window.BookingsManager = BookingsManager;
})();