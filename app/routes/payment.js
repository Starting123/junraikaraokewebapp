const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// POST /api/payment
router.post('/', async (req, res) => {
  const result = await paymentService.charge(req.body);
  if (result.success) {
    res.redirect('/confirmation');
  } else {
    res.render('pages/payment', { error: result.message, booking: req.body });
  }
});

module.exports = router;
