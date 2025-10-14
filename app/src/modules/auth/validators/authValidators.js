const { body, param, query } = require('express-validator');

const authValidators = {
    // Validation สำหรับการลงทะเบียน
    register: [
        body('name')
            .notEmpty()
            .withMessage('กรุณากรอกชื่อ')
            .isLength({ min: 2, max: 100 })
            .withMessage('ชื่อต้องมีความยาว 2-100 ตัวอักษร')
            .trim(),
        
        body('email')
            .isEmail()
            .withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage('อีเมลต้องมีความยาวไม่เกิน 255 ตัวอักษร'),
        
        body('password')
            .isLength({ min: 8 })
            .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('รหัสผ่านต้องมีตัวอักษรเล็ก ตัวอักษรใหญ่ และตัวเลข'),
        
        body('role_id')
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage('role_id ต้องเป็นตัวเลขระหว่าง 1-10')
    ],

    // Validation สำหรับการเข้าสู่ระบบ
    login: [
        body('email')
            .isEmail()
            .withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
            .normalizeEmail(),
        
        body('password')
            .notEmpty()
            .withMessage('กรุณากรอกรหัสผ่าน')
    ],

    // Validation สำหรับการเปลี่ยนรหัสผ่าน
    changePassword: [
        body('oldPassword')
            .notEmpty()
            .withMessage('กรุณากรอกรหัสผ่านเก่า'),
        
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('รหัสผ่านใหม่ต้องมีตัวอักษรเล็ก ตัวอักษรใหญ่ และตัวเลข')
    ]
};

module.exports = authValidators;