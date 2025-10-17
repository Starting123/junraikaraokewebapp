/**
 * ==========================================
 * STATE MANAGER
 * ==========================================
 */

class StateManager {
    static bookingStates = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    };

    static paymentStates = {
        'pending': ['processing', 'failed', 'cancelled'],
        'processing': ['completed', 'failed'],
        'completed': ['refunded'],
        'failed': [],
        'cancelled': [],
        'refunded': []
    };

    static roomStates = {
        'available': ['maintenance', 'booked', 'out_of_order'],
        'maintenance': ['available', 'out_of_order'],
        'booked': ['available'],
        'out_of_order': ['maintenance']
    };

    static validateTransition(currentState, newState, stateMap) {
        // Check if current state exists in state map
        if (!stateMap[currentState]) {
            throw new Error(`Invalid current state: ${currentState}`);
        }

        // Check if transition is allowed
        if (!stateMap[currentState].includes(newState)) {
            throw new Error(`Cannot transition from ${currentState} to ${newState}`);
        }

        return true;
    }

    static validateBookingTransition(currentState, newState) {
        return this.validateTransition(currentState, newState, this.bookingStates);
    }

    static validatePaymentTransition(currentState, newState) {
        return this.validateTransition(currentState, newState, this.paymentStates);
    }

    static validateRoomTransition(currentState, newState) {
        return this.validateTransition(currentState, newState, this.roomStates);
    }

    static getValidTransitions(currentState, stateMap) {
        return stateMap[currentState] || [];
    }

    static getValidBookingTransitions(currentState) {
        return this.getValidTransitions(currentState, this.bookingStates);
    }

    static getValidPaymentTransitions(currentState) {
        return this.getValidTransitions(currentState, this.paymentStates);
    }

    static getValidRoomTransitions(currentState) {
        return this.getValidTransitions(currentState, this.roomStates);
    }
}

module.exports = StateManager;