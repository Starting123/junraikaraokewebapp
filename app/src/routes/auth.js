

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
// Render forgot password page
router.get('/forgot-password', (req, res) => {
	res.render('auth/forgot-password');
});

// Render reset password page
router.get('/reset-password/:token', (req, res) => {
	res.render('auth/reset-password');
});
// Forgot password & reset password
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);



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