const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const result = await authService.sendResetLink(email);
  if (result.success) {
    res.render('pages/forgotPassword', { message: 'Reset link sent! Check console.' });
  } else {
    res.render('pages/forgotPassword', { error: 'Email not found.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  if (result.success) {
    res.redirect('/login');
  } else {
    res.render('pages/resetPassword', { error: result.message, token });
  }
});

module.exports = router;