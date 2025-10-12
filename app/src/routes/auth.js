const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');
const authValidators = require('../validators/authValidators');

// Public routes
router.post('/register', authValidators.register, AuthController.register);
router.post('/login', authValidators.login, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/verify-token', AuthController.verifyToken);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, authValidators.changePassword, AuthController.changePassword);

module.exports = router;