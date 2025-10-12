const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');

router.get('/:id/pdf', async (req, res) => {
  try {
    const pdfBuffer = await bookingService.generatePDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=booking.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(404).send('PDF generation failed');
  }
});

module.exports = router;