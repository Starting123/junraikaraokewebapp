const express = require('express');
const router = express.Router();

const RoomController = require('../controllers/RoomController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Room validation
const roomValidators = {
    create: [
        body('name')
            .notEmpty()
            .withMessage('กรุณากรอกชื่อห้อง')
            .isLength({ min: 2, max: 100 })
            .withMessage('ชื่อห้องต้องมีความยาว 2-100 ตัวอักษร'),
        
        body('type_id')
            .isInt({ min: 1 })
            .withMessage('กรุณาเลือกประเภทห้อง'),
        
        body('capacity')
            .isInt({ min: 1, max: 50 })
            .withMessage('ความจุต้องอยู่ระหว่าง 1-50 คน'),
        
        body('status')
            .optional()
            .isIn(['available', 'maintenance', 'out_of_order'])
            .withMessage('สถานะไม่ถูกต้อง')
    ],
    
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Room ID ไม่ถูกต้อง'),
        
        body('name')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('ชื่อห้องต้องมีความยาว 2-100 ตัวอักษร'),
        
        body('capacity')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('ความจุต้องอยู่ระหว่าง 1-50 คน')
    ],
    
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Room ID ไม่ถูกต้อง')
    ]
};

// Public routes (ดูข้อมูลห้องได้โดยไม่ต้อง login)
router.get('/', RoomController.getRooms);
router.get('/:id', roomValidators.getById, RoomController.getRoomById);
router.get('/:id/available-slots', roomValidators.getById, RoomController.getAvailableSlots);

// Protected routes - ต้อง login
router.use(authenticateToken);

// Admin only routes
router.post('/', requireAdmin, roomValidators.create, RoomController.createRoom);
router.put('/:id', requireAdmin, roomValidators.update, RoomController.updateRoom);
router.delete('/:id', requireAdmin, roomValidators.getById, RoomController.deleteRoom);

module.exports = router;