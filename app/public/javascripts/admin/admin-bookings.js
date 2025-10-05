// ==========================================
// ADMIN BOOKINGS MANAGEMENT
// ==========================================

class AdminBookings {
    constructor() {
        this.users = [];
        this.rooms = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUsersAndRooms();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }

        // Status form submission
        const statusForm = document.getElementById('bookingStatusForm');
        if (statusForm) {
            statusForm.addEventListener('submit', (e) => this.handleStatusUpdate(e));
        }

        // Room and time change for amount calculation
        const roomSelect = document.getElementById('roomId');
        const startTime = document.getElementById('startTime');
        const endTime = document.getElementById('endTime');

        if (roomSelect) roomSelect.addEventListener('change', () => this.calculateAmount());
        if (startTime) startTime.addEventListener('change', () => this.calculateAmount());
        if (endTime) endTime.addEventListener('change', () => this.calculateAmount());

        // Clear modals when closed
        const bookingModal = document.getElementById('bookingModal');
        if (bookingModal) {
            bookingModal.addEventListener('hidden.bs.modal', () => this.clearBookingForm());
        }

        // Set minimum date to today
        const bookingDate = document.getElementById('bookingDate');
        if (bookingDate) {
            bookingDate.min = new Date().toISOString().split('T')[0];
        }

        // Event delegation for action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-booking-btn')) {
                const bookingId = e.target.closest('.edit-booking-btn').dataset.bookingId;
                this.editBooking(bookingId);
            } else if (e.target.closest('.view-booking-btn')) {
                const bookingId = e.target.closest('.view-booking-btn').dataset.bookingId;
                this.viewBookingDetails(bookingId);
            } else if (e.target.closest('.cancel-booking-btn')) {
                const bookingId = e.target.closest('.cancel-booking-btn').dataset.bookingId;
                this.cancelBooking(bookingId);
            }
        });
    }

    async loadUsersAndRooms() {
        try {
            // Load users
            const usersResponse = await fetch('/admin/api/users');
            const usersData = await usersResponse.json();
            this.users = usersData || [];

            // Load rooms
            const roomsResponse = await fetch('/admin/api/rooms');
            const roomsData = await roomsResponse.json();
            this.rooms = roomsData || [];

            this.populateSelects();
        } catch (error) {
            console.error('Error loading users and rooms:', error);
            this.showError('Failed to load users and rooms data');
        }
    }

    populateSelects() {
        // Populate users select
        const userSelect = document.getElementById('userId');
        if (userSelect && this.users) {
            userSelect.innerHTML = '<option value="">Select a customer</option>';
            this.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.first_name} ${user.last_name} (${user.username})`;
                userSelect.appendChild(option);
            });
        }

        // Populate rooms select
        const roomSelect = document.getElementById('roomId');
        if (roomSelect && this.rooms) {
            roomSelect.innerHTML = '<option value="">Select a room</option>';
            this.rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = `${room.room_name} (${room.room_type}) - ₿${room.hourly_rate}/hour`;
                option.dataset.rate = room.hourly_rate;
                roomSelect.appendChild(option);
            });
        }
    }

    setupFormValidation() {
        // Validate time range
        const startTime = document.getElementById('startTime');
        const endTime = document.getElementById('endTime');
        
        if (endTime) {
            endTime.addEventListener('change', () => {
                if (startTime.value && endTime.value && startTime.value >= endTime.value) {
                    endTime.setCustomValidity('End time must be after start time');
                } else {
                    endTime.setCustomValidity('');
                }
            });
        }
    }

    calculateAmount() {
        const roomSelect = document.getElementById('roomId');
        const startTime = document.getElementById('startTime');
        const endTime = document.getElementById('endTime');
        const amountDisplay = document.getElementById('calculatedAmount');

        if (!roomSelect.value || !startTime.value || !endTime.value) {
            if (amountDisplay) {
                amountDisplay.textContent = 'Will be calculated based on room rate and duration';
            }
            return;
        }

        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        const hourlyRate = parseFloat(selectedOption.dataset.rate);
        
        // Calculate duration in hours
        const start = this.timeToMinutes(startTime.value);
        const end = this.timeToMinutes(endTime.value);
        
        if (end <= start) {
            if (amountDisplay) {
                amountDisplay.textContent = 'Invalid time range';
            }
            return;
        }
        
        const durationMinutes = end - start;
        const durationHours = durationMinutes / 60;
        const totalAmount = hourlyRate * durationHours;
        
        if (amountDisplay) {
            amountDisplay.textContent = `${durationHours.toFixed(1)} hours × ₿${hourlyRate} = ₿${totalAmount.toFixed(2)}`;
        }
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    async handleBookingSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const bookingData = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/admin/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                this.closeBookingModal();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showError(result.error || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            this.showError('Failed to create booking');
        }
    }

    async editBooking(bookingId) {
        try {
            const response = await fetch(`/admin/bookings/${bookingId}`);
            const result = await response.json();
            
            if (result.success) {
                const booking = result.booking;
                
                // Fill status form
                document.getElementById('statusBookingId').value = booking.id;
                document.getElementById('bookingStatus').value = booking.status;
                document.getElementById('statusNotes').value = booking.notes || '';
                
                // Show status modal
                const modal = new bootstrap.Modal(document.getElementById('bookingStatusModal'));
                modal.show();
            } else {
                this.showError(result.error || 'Failed to load booking');
            }
        } catch (error) {
            console.error('Error loading booking:', error);
            this.showError('Failed to load booking details');
        }
    }

    async handleStatusUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const statusData = Object.fromEntries(formData.entries());
        const bookingId = statusData.id;
        delete statusData.id;
        
        try {
            const response = await fetch(`/admin/bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statusData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                this.closeStatusModal();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showError(result.error || 'Failed to update booking');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            this.showError('Failed to update booking status');
        }
    }

    async viewBookingDetails(bookingId) {
        try {
            const response = await fetch(`/admin/bookings/${bookingId}`);
            const result = await response.json();
            
            if (result.success) {
                const booking = result.booking;
                
                const detailsHtml = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-user me-2"></i>Customer Information</h6>
                            <table class="table table-borderless">
                                <tr>
                                    <td><strong>Name:</strong></td>
                                    <td>${booking.customer_name}</td>
                                </tr>
                                <tr>
                                    <td><strong>Email:</strong></td>
                                    <td>${booking.email}</td>
                                </tr>
                                <tr>
                                    <td><strong>Phone:</strong></td>
                                    <td>${booking.phone_number || 'N/A'}</td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-door-open me-2"></i>Booking Information</h6>
                            <table class="table table-borderless">
                                <tr>
                                    <td><strong>Room:</strong></td>
                                    <td>${booking.room_name} (${booking.room_type})</td>
                                </tr>
                                <tr>
                                    <td><strong>Date:</strong></td>
                                    <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Time:</strong></td>
                                    <td>${booking.start_time} - ${booking.end_time}</td>
                                </tr>
                                <tr>
                                    <td><strong>Duration:</strong></td>
                                    <td>${this.calculateDuration(booking.start_time, booking.end_time)} hours</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-info-circle me-2"></i>Status & Payment</h6>
                            <table class="table table-borderless">
                                <tr>
                                    <td><strong>Status:</strong></td>
                                    <td><span class="badge bg-${this.getStatusColor(booking.status)}">${booking.status}</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Payment Status:</strong></td>
                                    <td><span class="badge bg-${this.getStatusColor(booking.payment_status)}">${booking.payment_status || 'unpaid'}</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Total Amount:</strong></td>
                                    <td><strong>₿${booking.total_amount}</strong></td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-calendar me-2"></i>Timestamps</h6>
                            <table class="table table-borderless">
                                <tr>
                                    <td><strong>Created:</strong></td>
                                    <td>${new Date(booking.created_at).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Updated:</strong></td>
                                    <td>${new Date(booking.updated_at).toLocaleString()}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    ${booking.notes ? `
                    <hr>
                    <h6><i class="fas fa-sticky-note me-2"></i>Notes</h6>
                    <p class="text-muted">${booking.notes}</p>
                    ` : ''}
                `;
                
                // Create and show modal
                const modalHTML = `
                    <div class="modal fade" id="bookingDetailsModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Booking Details #${booking.id}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    ${detailsHtml}
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                const existingModal = document.getElementById('bookingDetailsModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Add new modal
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
                modal.show();
            } else {
                this.showError(result.error || 'Failed to load booking details');
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            this.showError('Failed to load booking details');
        }
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    status: 'cancelled',
                    notes: 'Cancelled by admin'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Booking cancelled successfully');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showError(result.error || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showError('Failed to cancel booking');
        }
    }

    calculateDuration(startTime, endTime) {
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        return ((end - start) / 60).toFixed(1);
    }

    clearBookingForm() {
        const form = document.getElementById('bookingForm');
        if (form) {
            form.reset();
            const amountDisplay = document.getElementById('calculatedAmount');
            if (amountDisplay) {
                amountDisplay.textContent = 'Will be calculated based on room rate and duration';
            }
        }
    }

    closeBookingModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
        if (modal) {
            modal.hide();
        }
    }

    closeStatusModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingStatusModal'));
        if (modal) {
            modal.hide();
        }
    }

    getStatusColor(status) {
        const colorMap = {
            'confirmed': 'success',
            'pending': 'warning',
            'cancelled': 'danger',
            'completed': 'primary',
            'paid': 'success',
            'unpaid': 'danger'
        };
        return colorMap[status] || 'secondary';
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('bookingForm')) {
        window.adminBookings = new AdminBookings();
    }
});