const express = require('express');
const router = express.Router();

const UserController = require('../controllers/UserController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../../../core/middleware/auth');
const { body, param, query } = require('express-validator');

// User validation
const userValidators = {
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('User ID ไม่ถูกต้อง'),
        
        body('name')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('ชื่อต้องมีความยาว 2-100 ตัวอักษร'),
        
        body('email')
            .optional()
            .isEmail()
            .withMessage('กรุณากรอกอีเมลที่ถูกต้อง'),
        
        body('role_id')
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage('Role ID ไม่ถูกต้อง'),
        
        body('status')
            .optional()
            .isIn(['active', 'inactive', 'suspended'])
            .withMessage('สถานะไม่ถูกต้อง')
    ],
    
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('User ID ไม่ถูกต้อง')
    ],
    
    changeStatus: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('User ID ไม่ถูกต้อง'),
        
        body('status')
            .isIn(['active', 'inactive', 'suspended'])
            .withMessage('สถานะไม่ถูกต้อง')
    ]
};

// Protected routes - ต้อง login ทั้งหมด
router.use(authenticateToken);

// Admin only routes
router.get('/', requireAdmin, UserController.getUsers);
router.delete('/:id', requireAdmin, userValidators.getById, UserController.deleteUser);
router.post('/:id/status', requireAdmin, userValidators.changeStatus, UserController.changeUserStatus);

// User can access own data, admin can access all
router.get('/:id', userValidators.getById, UserController.getUserById);
router.put('/:id', userValidators.update, UserController.updateUser);

module.exports = router;