const express = require('express');

const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');
const authValidators = require('../validators/authValidators');

const pageRouter = express.Router();
const apiRouter = express.Router();

/**
 * Authentication feature pages
 */
pageRouter.get('/', (req, res) => {
  res.render('auth');
});

pageRouter.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password');
});

pageRouter.get('/reset-password/:token', (req, res) => {
  res.render('auth/reset-password');
});

/**
 * Authentication API routes
 */
apiRouter.post('/register', authValidators.register, AuthController.register);
apiRouter.post('/login', authValidators.login, AuthController.login);
apiRouter.post('/refresh-token', AuthController.refreshToken);
apiRouter.post('/verify-token', AuthController.verifyToken);

apiRouter.post('/forgot-password', AuthController.forgotPassword);
apiRouter.post('/reset-password/:token', AuthController.resetPassword);

apiRouter.post('/logout', authenticateToken, AuthController.logout);
apiRouter.get('/profile', authenticateToken, AuthController.getProfile);
apiRouter.post(
  '/change-password',
  authenticateToken,
  authValidators.changePassword,
  AuthController.changePassword
);

module.exports = {
  pageRouter,
  apiRouter,
};
