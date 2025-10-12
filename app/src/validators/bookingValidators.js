const { body, param, query } = require('express-validator');

const bookingValidators = {
    // Validation สำหรับการสร้างการจอง
    createBooking: [
        body('room_id')
            .isInt({ min: 1 })
            .withMessage('กรุณาเลือกห้อง'),
        
        body('start_time')
            .isISO8601()
            .withMessage('กรุณาระบุเวลาเริ่มต้นที่ถูกต้อง')
            .custom((value) => {
                const startTime = new Date(value);
                const now = new Date();
                if (startTime <= now) {
                    throw new Error('เวลาเริ่มต้นต้องเป็นเวลาในอนาคต');
                }
                return true;
            }),
        
        body('end_time')
            .isISO8601()
            .withMessage('กรุณาระบุเวลาสิ้นสุดที่ถูกต้อง')
            .custom((value, { req }) => {
                const startTime = new Date(req.body.start_time);
                const endTime = new Date(value);
                if (endTime <= startTime) {
                    throw new Error('เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น');
                }
                // ตรวจสอบระยะเวลาสูงสุด (เช่น 12 ชั่วโมง)
                const maxDuration = 12 * 60 * 60 * 1000; // 12 ชั่วโมง in milliseconds
                if (endTime - startTime > maxDuration) {
                    throw new Error('ระยะเวลาการจองต้องไม่เกิน 12 ชั่วโมง');
                }
                return true;
            }),
        
        body('duration_hours')
            .optional()
            .isFloat({ min: 0.5, max: 12 })
            .withMessage('ระยะเวลาต้องอยู่ระหว่าง 0.5-12 ชั่วโมง')
    ],

    // Validation สำหรับการแก้ไขการจอง
    updateBooking: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('booking id ไม่ถูกต้อง'),
        
        body('room_id')
            .optional()
            .isInt({ min: 1 })
            .withMessage('กรุณาเลือกห้อง'),
        
        body('start_time')
            .optional()
            .isISO8601()
            .withMessage('กรุณาระบุเวลาเริ่มต้นที่ถูกต้อง'),
        
        body('end_time')
            .optional()
            .isISO8601()
            .withMessage('กรุณาระบุเวลาสิ้นสุดที่ถูกต้อง'),
        
        body('status')
            .optional()
            .isIn(['active', 'confirmed', 'cancelled', 'completed'])
            .withMessage('สถานะไม่ถูกต้อง')
    ],

    // Validation สำหรับการดึงรายการการจอง
    getBookings: [
        query('room_id')
            .optional()
            .isInt({ min: 1 })
            .withMessage('room_id ต้องเป็นตัวเลขที่มากกว่า 0'),
        
        query('user_id')
            .optional()
            .isInt({ min: 1 })
            .withMessage('user_id ต้องเป็นตัวเลขที่มากกว่า 0'),
        
        query('status')
            .optional()
            .isIn(['active', 'confirmed', 'cancelled', 'completed', 'expired'])
            .withMessage('status ไม่ถูกต้อง'),
        
        query('payment_status')
            .optional()
            .isIn(['pending', 'paid', 'failed', 'cancelled', 'refunded'])
            .withMessage('payment_status ไม่ถูกต้อง'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 500 })
            .withMessage('limit ต้องอยู่ระหว่าง 1-500')
    ],

    // Validation สำหรับการดึงรายละเอียดการจอง
    getBookingById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('booking id ไม่ถูกต้อง')
    ],

    // Validation สำหรับการตรวจสอบช่วงเวลาว่าง
    getAvailableTimeSlots: [
        param('room_id')
            .isInt({ min: 1 })
            .withMessage('room_id ไม่ถูกต้อง'),
        
        query('date')
            .isDate()
            .withMessage('กรุณาระบุวันที่ในรูปแบบ YYYY-MM-DD')
            .custom((value) => {
                const queryDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (queryDate < today) {
                    throw new Error('ไม่สามารถค้นหาช่วงเวลาในอดีตได้');
                }
                
                // ตรวจสอบว่าไม่เกิน 30 วันในอนาคต
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 30);
                if (queryDate > maxDate) {
                    throw new Error('สามารถค้นหาได้เพียง 30 วันข้างหน้าเท่านั้น');
                }
                
                return true;
            })
    ]
};

module.exports = bookingValidators;