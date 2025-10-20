const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');
const authValidators = require('../validators/authValidators');
// Unified auth view routes
router.get('/login', (req, res) => res.render('auth/login'));
router.get('/register', (req, res) => res.render('auth/register'));
router.get('/forgot', (req, res) => res.render('auth/forgot-password'));
router.get('/reset-password', (req, res) => res.render('auth/reset-password'));
router.get('/reset/:token', (req, res) => res.render('auth/reset-password', { token: req.params.token }));

// API endpoints
router.post('/login', authValidators.login, AuthController.login);
router.post('/register', authValidators.register, AuthController.register);
router.post('/forgot', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPasswordWithOTP);
router.post('/reset/:token', AuthController.resetPassword);

// Other public/protected routes
router.post('/refresh-token', AuthController.refreshToken);
router.post('/verify-token', AuthController.verifyToken);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, authValidators.changePassword, AuthController.changePassword);

module.exports = router;