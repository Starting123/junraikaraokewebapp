const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../../../core/middleware/auth');
const authValidators = require('../validators/authValidators');

// Root auth route - redirect to login
router.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Page routes
router.get('/login', AuthController.showLoginForm);
router.get('/register', AuthController.showRegisterForm);
router.get('/forgot-password', AuthController.showForgotPasswordForm);
router.get('/reset-password/:token', AuthController.showResetPasswordForm);

// Public API routes
router.post('/register', authValidators.register, AuthController.register);
router.post('/login', authValidators.login, AuthController.login);
router.post('/forgot-password', AuthController.handleForgotPassword);
router.post('/reset-password/:token', AuthController.handleResetPassword);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/verify-token', AuthController.verifyToken);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, authValidators.changePassword, AuthController.changePassword);

module.exports = router;