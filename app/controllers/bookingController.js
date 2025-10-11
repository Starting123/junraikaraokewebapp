/**
 * ==========================================
 * Booking Controller
 * Handles all booking-related business logic
 * ==========================================
 */

const bookingsModel = require('../models/bookings');
const roomsModel = require('../models/rooms');
const ApiResponse = require('../middleware/apiResponse');

class BookingController {
    
    /**
     * Create a new booking
     */
    async createBooking(req, res, next) {
        try {
            const { room_id, start_time, end_time, duration_hours = 1, customer_id } = req.body;
            const start = new Date(start_time);
            const end = new Date(end_time);
            
            // Validate time range
            if (!(start < end)) {
                return ApiResponse.error(res, 'Start time must be before end time', 400);
            }

            // Check room exists
            const room = await roomsModel.getById(room_id);
            if (!room) {
                return ApiResponse.notFound(res, 'Room');
            }

            // Check room availability
            const availability = await roomsModel.checkRoomAvailability(room_id, start_time, end_time);
            if (!availability.available) {
                const nextAvailableMsg = availability.nextAvailable 
                    ? `สามารถจองได้อีกครั้งในเวลา ${new Date(availability.nextAvailable).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}` 
                    : '';
                
                return ApiResponse.conflict(res, 'Room already booked', {
                    message: availability.message,
                    nextAvailable: availability.nextAvailable,
                    suggestion: nextAvailableMsg,
                    conflicts: availability.conflicts
                });
            }

            // Determine user ID (admin can book for others)
            let user_id = req.user.user_id;
            if (customer_id) {
                if (req.user.role_id !== 1) {
                    return ApiResponse.forbidden(res, 'Admin privileges required to create booking for another user');
                }
                user_id = customer_id;
            }
            
            // Create booking
            const booking = await bookingsModel.create({ 
                user_id, 
                room_id, 
                start_time, 
                end_time, 
                duration_hours 
            });
            
            // Update room status
            await roomsModel.updateRoomStatus();
            
            return ApiResponse.success(res, { booking }, 'Booking created successfully', 201);
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get user's bookings
     */
    async getUserBookings(req, res, next) {
        try {
            const { status, payment_status, page = 1, limit = 20 } = req.query;
            
            const bookings = await bookingsModel.list({
                user_id: req.user.user_id,
                status,
                payment_status,
                isAdmin: false,
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return ApiResponse.success(res, { bookings }, 'Bookings retrieved successfully');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get all bookings (admin only)
     */
    async getAllBookings(req, res, next) {
        try {
            const { room_id, status, payment_status, customer_id, page = 1, limit = 50 } = req.query;
            
            const listUserId = (req.user.role_id === 1 && customer_id) ? customer_id : null;
            
            const bookings = await bookingsModel.list({
                user_id: listUserId,
                room_id,
                status,
                payment_status,
                isAdmin: req.user.role_id === 1,
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return ApiResponse.success(res, { bookings }, 'All bookings retrieved successfully');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get booking by ID
     */
    async getBookingById(req, res, next) {
        try {
            const { id } = req.params;
            const booking = await bookingsModel.getById(id);
            
            if (!booking) {
                return ApiResponse.notFound(res, 'Booking');
            }

            // Check ownership (users can only see their own bookings, admins can see all)
            if (req.user.role_id !== 1 && booking.user_id !== req.user.user_id) {
                return ApiResponse.forbidden(res, 'Access denied to this booking');
            }

            return ApiResponse.success(res, { booking }, 'Booking retrieved successfully');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['active', 'cancelled', 'completed'];
            if (!validStatuses.includes(status)) {
                return ApiResponse.error(res, 'Invalid status value', 400);
            }

            const booking = await bookingsModel.getById(id);
            if (!booking) {
                return ApiResponse.notFound(res, 'Booking');
            }

            // Check permissions
            const isOwner = booking.user_id === req.user.user_id;
            const isAdmin = req.user.role_id === 1;
            
            if (!isOwner && !isAdmin) {
                return ApiResponse.forbidden(res, 'Access denied to update this booking');
            }

            // Update booking
            await bookingsModel.updateStatus(id, status);
            
            // Update room status if needed
            await roomsModel.updateRoomStatus();

            return ApiResponse.success(res, null, 'Booking status updated successfully');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update booking payment status (admin only)
     */
    async updatePaymentStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { payment_status } = req.body;

            const validPaymentStatuses = ['pending', 'paid', 'failed'];
            if (!validPaymentStatuses.includes(payment_status)) {
                return ApiResponse.error(res, 'Invalid payment status value', 400);
            }

            const booking = await bookingsModel.getById(id);
            if (!booking) {
                return ApiResponse.notFound(res, 'Booking');
            }

            // Update payment status
            await bookingsModel.updatePaymentStatus(id, payment_status);

            return ApiResponse.success(res, null, 'Payment status updated successfully');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking(req, res, next) {
        try {
            const { id } = req.params;
            
            const booking = await bookingsModel.getById(id);
            if (!booking) {
                return ApiResponse.notFound(res, 'Booking');
            }

            // Check permissions
            const isOwner = booking.user_id === req.user.user_id;
            const isAdmin = req.user.role_id === 1;
            
            if (!isOwner && !isAdmin) {
                return ApiResponse.forbidden(res, 'Access denied to cancel this booking');
            }

            // Check if booking can be cancelled
            if (booking.status === 'cancelled') {
                return ApiResponse.error(res, 'Booking is already cancelled', 400);
            }

            if (booking.status === 'completed') {
                return ApiResponse.error(res, 'Cannot cancel completed booking', 400);
            }

            // Cancel booking
            await bookingsModel.updateStatus(id, 'cancelled');
            
            // Update room status
            await roomsModel.updateRoomStatus();

            return ApiResponse.success(res, null, 'Booking cancelled successfully');
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new BookingController();