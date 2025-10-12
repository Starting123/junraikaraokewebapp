const PDFDocument = require('pdfkit');
const db = require('../db');

module.exports.generatePDF = async function(bookingId) {
  // Fetch booking info from DB
  const [rows] = await db.query('SELECT b.*, r.name as roomName, r.price_per_hour FROM bookings b JOIN rooms r ON b.room_id = r.room_id WHERE b.booking_id = ?', [bookingId]);
  if (!rows.length) throw new Error('Booking not found');
  const booking = rows[0];

  // Create PDF
  const doc = new PDFDocument();
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(20).text('Booking Confirmation', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Room: ${booking.roomName}`);
  doc.text(`Price per hour: ${booking.price_per_hour}`);
  doc.text(`Date: ${booking.start_time}`);
  doc.text(`Total hours: ${booking.total_hours}`);
  doc.text(`Total price: ${booking.total_price}`);

  doc.end();
  return Buffer.concat(buffers);
};
