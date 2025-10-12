/**
 * Bookings Page Module
 * Page-specific functionality for /bookings
 */

import { $, $$, on } from "../core/dom.js";
import { apiGet, apiPost, apiDelete } from "../core/api.js";
import { showToast, emit } from "../core/events.js";

/**
 * Initialize bookings page
 * Called when bookings page loads
 */
export function initBookingsPage() {
    console.log('Initializing bookings page...');
    
    loadUserBookings();
    setupBookingFilters();
    setupBookingActions();
    
    // Listen for booking updates
    window.EventBus.on('booking:updated', handleBookingUpdate);
    window.EventBus.on('booking:cancelled', handleBookingCancellation);
}

/**
 * Load and display user bookings
 */
async function loadUserBookings() {
    const container = $('#bookings-list');
    const loading = $('#bookings-loading');
    const empty = $('#bookings-empty');
    
    if (!container) return;
    
    try {
        loading?.style?.setProperty('display', 'block');
        
        const response = await apiGet('/bookings/user');
        const bookings = response.bookings || [];
        
        loading?.style?.setProperty('display', 'none');
        
        if (bookings.length === 0) {
            empty?.style?.setProperty('display', 'block');
            return;
        }
        
        container.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
        container.style.display = 'block';
        
        // Update stats
        updateBookingStats(bookings);
        
    } catch (error) {
        console.error('Failed to load bookings:', error);
        loading?.style?.setProperty('display', 'none');
        showToast('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
    }
}

/**
 * Create booking card HTML
 * @param {Object} booking - Booking data
 * @returns {string} HTML string
 */
function createBookingCard(booking) {
    const statusClass = getStatusClass(booking.status);
    const statusText = getStatusText(booking.status);
    
    return `
        <div class="booking-card ${statusClass}" data-booking-id="${booking.booking_id}">
            <div class="booking-header">
                <div class="booking-room">
                    <h3>${booking.room_name}</h3>
                    <span class="room-type">${booking.room_type}</span>
                </div>
                <div class="booking-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            
            <div class="booking-details">
                <div class="booking-time">
                    <i class="fas fa-calendar"></i>
                    <span>${formatBookingDate(booking.booking_date)}</span>
                </div>
                <div class="booking-duration">
                    <i class="fas fa-clock"></i>
                    <span>${booking.start_time} - ${booking.end_time}</span>
                </div>
                <div class="booking-price">
                    <i class="fas fa-money-bill"></i>
                    <span>${booking.total_price} บาท</span>
                </div>
            </div>
            
            <div class="booking-actions">
                ${createBookingActions(booking)}
            </div>
        </div>
    `;
}

/**
 * Setup booking filters
 */
function setupBookingFilters() {
    const statusFilter = $('#status-filter');
    const dateRangeFilter = $('#date-range-filter');
    
    if (statusFilter) {
        on(statusFilter, 'change', (e) => {
            filterBookings();
        });
    }
    
    if (dateRangeFilter) {
        on(dateRangeFilter, 'change', (e) => {
            filterBookings();
        });
    }
}

/**
 * Setup booking actions
 */
function setupBookingActions() {
    const container = $('#bookings-list');
    
    if (!container) return;
    
    // Delegate event handling for booking actions
    on(container, 'click', async (e) => {
        const target = e.target;
        
        if (target.classList.contains('btn-cancel-booking')) {
            const bookingId = target.dataset.bookingId;
            await handleBookingCancellation(bookingId);
        }
        
        if (target.classList.contains('btn-view-booking')) {
            const bookingId = target.dataset.bookingId;
            showBookingDetails(bookingId);
        }
        
        if (target.classList.contains('btn-rebook')) {
            const bookingId = target.dataset.bookingId;
            handleRebooking(bookingId);
        }
    });
}

/**
 * Handle booking cancellation
 * @param {string} bookingId - Booking ID to cancel
 */
async function handleBookingCancellation(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) {
        return;
    }
    
    try {
        await apiDelete(`/bookings/${bookingId}`);
        showToast('ยกเลิกการจองสำเร็จ', 'success');
        
        // Emit event for other components
        emit('booking:cancelled', { bookingId });
        
        // Reload bookings
        loadUserBookings();
        
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        showToast('ไม่สามารถยกเลิกการจองได้', 'error');
    }
}

/**
 * Filter bookings based on current filter values
 */
function filterBookings() {
    const statusFilter = $('#status-filter')?.value || '';
    const dateRangeFilter = $('#date-range-filter')?.value || '';
    const bookingCards = $$('.booking-card');
    
    let visibleCount = 0;
    
    bookingCards.forEach(card => {
        let shouldShow = true;
        
        // Status filter
        if (statusFilter && !card.classList.contains(statusFilter)) {
            shouldShow = false;
        }
        
        // Date range filter (implement based on your requirements)
        if (dateRangeFilter) {
            shouldShow = shouldShow && matchesDateRange(card, dateRangeFilter);
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    // Update empty state
    const empty = $('#bookings-empty');
    const list = $('#bookings-list');
    
    if (visibleCount === 0 && bookingCards.length > 0) {
        empty?.style?.setProperty('display', 'block');
        list?.style?.setProperty('display', 'none');
    } else {
        empty?.style?.setProperty('display', 'none');
        list?.style?.setProperty('display', 'block');
    }
}

/**
 * Utility functions
 */
function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-unknown';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'รอการยืนยัน',
        'confirmed': 'ยืนยันแล้ว',
        'completed': 'เสร็จสิ้น',
        'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || 'ไม่ทราบสถานะ';
}

function formatBookingDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

function createBookingActions(booking) {
    const actions = [];
    
    actions.push(`<button class="btn btn-outline btn-small btn-view-booking" data-booking-id="${booking.booking_id}">ดูรายละเอียด</button>`);
    
    if (booking.status === 'pending' || booking.status === 'confirmed') {
        actions.push(`<button class="btn btn-danger btn-small btn-cancel-booking" data-booking-id="${booking.booking_id}">ยกเลิก</button>`);
    }
    
    if (booking.status === 'completed' || booking.status === 'cancelled') {
        actions.push(`<button class="btn btn-primary btn-small btn-rebook" data-booking-id="${booking.booking_id}">จองใหม่</button>`);
    }
    
    return actions.join('');
}

function updateBookingStats(bookings) {
    const totalCount = $('#total-bookings-count');
    if (totalCount) {
        totalCount.textContent = `${bookings.length} รายการ`;
    }
}

function matchesDateRange(card, dateRange) {
    // Implement date range matching logic based on your requirements
    return true;
}

function showBookingDetails(bookingId) {
    // Implement booking details modal
    console.log('Show booking details for:', bookingId);
}

function handleRebooking(bookingId) {
    // Redirect to booking page with prefilled data
    window.location.href = `/rooms?rebook=${bookingId}`;
}

function handleBookingUpdate(data) {
    console.log('Booking updated:', data);
    loadUserBookings(); // Reload bookings
}

// Auto-initialize if we're on the bookings page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.serverData?.currentPage === 'bookings') {
            initBookingsPage();
        }
    });
} else if (window.serverData?.currentPage === 'bookings') {
    initBookingsPage();
}