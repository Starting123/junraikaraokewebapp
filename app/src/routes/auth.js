

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
// Unified auth view routes
router.get('/login', (req, res) => res.render('auth/login'));
router.get('/register', (req, res) => res.render('auth/register'));
router.get('/forgot', (req, res) => res.render('auth/forgot'));
router.get('/reset/:token', (req, res) => res.render('auth/reset', { token: req.params.token }));
router.get('/reset-invalid', (req, res) => res.render('auth/reset_invalid'));

// API endpoints
router.post('/login', authValidators.login, AuthController.login);
router.post('/register', authValidators.register, AuthController.register);
router.post('/forgot', AuthController.forgotPassword);
router.post('/reset/:token', AuthController.resetPassword);



const { authenticateToken } = require('../middleware/auth');
const authValidators = require('../validators/authValidators');

// Other public/protected routes
router.post('/refresh-token', AuthController.refreshToken);
router.post('/verify-token', AuthController.verifyToken);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, authValidators.changePassword, AuthController.changePassword);

module.exports = router;