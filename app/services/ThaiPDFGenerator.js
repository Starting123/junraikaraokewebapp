const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Thai-enabled PDF Receipt Generator
 * Supports Thai fonts and proper text rendering
 */
class ThaiPDFGenerator {
    constructor() {
        this.fonts = {
            // Using system fonts or bundled fonts
            thai: {
                regular: path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf'),
                bold: path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf')
            },
            english: {
                regular: 'Helvetica',
                bold: 'Helvetica-Bold'
            }
        };
    }

    /**
     * Convert Thai text to Roman transliteration if font not available
     */
    convertThaiToRoman(text) {
        const thaiToRomanMap = {
            'ก': 'ka', 'ข': 'kha', 'ค': 'kha', 'ง': 'nga',
            'จ': 'cha', 'ฉ': 'cha', 'ช': 'cha', 'ซ': 'sa',
            'ญ': 'ya', 'ด': 'da', 'ต': 'ta', 'ถ': 'tha',
            'ท': 'tha', 'น': 'na', 'บ': 'ba', 'ป': 'pa',
            'ผ': 'pha', 'ฝ': 'fa', 'พ': 'pha', 'ฟ': 'fa',
            'ม': 'ma', 'ย': 'ya', 'ร': 'ra', 'ล': 'la',
            'ว': 'wa', 'ส': 'sa', 'ห': 'ha', 'อ': 'a',
            'ฮ': 'ha',
            // Vowels
            'า': 'a', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue',
            'ื': 'ue', 'ุ': 'u', 'ู': 'u', 'เ': 'e',
            'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',
            // Tone marks (simplified)
            '่': '', '้': '', '๊': '', '๋': '',
            // Numbers
            '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
            '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
        };

        return text.split('').map(char => thaiToRomanMap[char] || char).join('');
    }

    /**
     * Check if Thai fonts are available
     */
    hasThaiFont() {
        return fs.existsSync(this.fonts.thai.regular);
    }

    /**
     * Create receipt PDF with Thai support
     */
    async generateReceipt(receiptData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: 'Junrai Karaoke Receipt',
                        Author: 'Junrai Karaoke System',
                        Subject: `Receipt #${receiptData.receiptNumber}`,
                        Creator: 'Junrai Karaoke WebApp'
                    }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Register Thai fonts if available
                const useThaiFont = this.hasThaiFont();
                if (useThaiFont) {
                    doc.registerFont('ThaiRegular', this.fonts.thai.regular);
                    doc.registerFont('ThaiBold', this.fonts.thai.bold);
                }

                // Helper function to add text with proper font
                const addText = (text, x, y, options = {}) => {
                    const hasThaiChars = /[\u0E00-\u0E7F]/.test(text);
                    
                    if (hasThaiChars && useThaiFont) {
                        doc.font(options.bold ? 'ThaiBold' : 'ThaiRegular');
                    } else {
                        doc.font(options.bold ? this.fonts.english.bold : this.fonts.english.regular);
                        // Convert Thai to Roman if no Thai font available
                        if (hasThaiChars) {
                            text = this.convertThaiToRoman(text);
                        }
                    }

                    return doc.text(text, x, y, options);
                };

                // Header
                doc.fillColor('#FF6B35');
                doc.rect(0, 0, doc.page.width, 80).fill();
                
                doc.fillColor('white');
                addText('🎤 Junrai Karaoke', 50, 25, { 
                    fontSize: 24, 
                    bold: true 
                });

                // Receipt title
                doc.fillColor('black');
                addText('ใบเสร็จรับเงิน / Receipt', 50, 100, { 
                    fontSize: 18, 
                    bold: true 
                });

                // Receipt details
                const details = [
                    ['เลขที่ใบเสร็จ / Receipt No:', receiptData.receiptNumber],
                    ['วันที่ / Date:', receiptData.date],
                    ['ลูกค้า / Customer:', receiptData.customerName],
                    ['อีเมล / Email:', receiptData.customerEmail],
                    ['ห้อง / Room:', receiptData.roomName],
                    ['ประเภทห้อง / Room Type:', receiptData.roomType],
                    ['วันที่จอง / Booking Date:', receiptData.bookingDate],
                    ['เวลา / Time:', `${receiptData.startTime} - ${receiptData.endTime}`],
                    ['จำนวนชั่วโมง / Duration:', `${receiptData.duration} ชั่วโมง`]
                ];

                let yPosition = 140;
                details.forEach(([label, value]) => {
                    addText(label, 50, yPosition, { fontSize: 11 });
                    addText(value, 250, yPosition, { fontSize: 11, bold: true });
                    yPosition += 20;
                });

                // Payment summary
                yPosition += 20;
                addText('รายละเอียดการชำระเงิน / Payment Details', 50, yPosition, { 
                    fontSize: 14, 
                    bold: true 
                });

                yPosition += 30;
                const paymentDetails = [
                    ['ค่าห้อง / Room Rate:', `${receiptData.roomRate} บาท/ชั่วโมง`],
                    ['จำนวนชั่วโมง / Hours:', `${receiptData.duration} ชั่วโมง`],
                    ['รวมย่อย / Subtotal:', `${receiptData.subtotal} บาท`],
                    ['ส่วนลด / Discount:', `${receiptData.discount || 0} บาท`],
                    ['ยอดรวมทั้งสิ้น / Total Amount:', `${receiptData.totalAmount} บาท`]
                ];

                paymentDetails.forEach(([label, value]) => {
                    addText(label, 50, yPosition, { fontSize: 11 });
                    addText(value, 350, yPosition, { fontSize: 11, bold: true });
                    yPosition += 20;
                });

                // Payment method
                yPosition += 20;
                addText('วิธีการชำระเงิน / Payment Method:', 50, yPosition, { fontSize: 11 });
                addText(receiptData.paymentMethod, 250, yPosition, { fontSize: 11, bold: true });

                if (receiptData.paymentMethod === 'การโอนเงิน / Bank Transfer') {
                    yPosition += 20;
                    addText('หมายเลขธุรกรรม / Transaction ID:', 50, yPosition, { fontSize: 11 });
                    addText(receiptData.transactionId || 'N/A', 250, yPosition, { fontSize: 11 });
                }

                // Footer
                yPosition += 60;
                addText('ขอบคุณที่ใช้บริการ / Thank you for your business!', 50, yPosition, { 
                    fontSize: 12, 
                    bold: true 
                });

                yPosition += 20;
                addText('Junrai Karaoke - เสียงเพลงแห่งความสุข', 50, yPosition, { 
                    fontSize: 10 
                });

                // QR Code for digital receipt (if needed)
                yPosition += 30;
                addText('สแกน QR Code เพื่อดูใบเสร็จออนไลน์', 50, yPosition, { 
                    fontSize: 9 
                });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate booking confirmation PDF
     */
    async generateBookingConfirmation(bookingData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                const useThaiFont = this.hasThaiFont();
                if (useThaiFont) {
                    doc.registerFont('ThaiRegular', this.fonts.thai.regular);
                    doc.registerFont('ThaiBold', this.fonts.thai.bold);
                }

                const addText = (text, x, y, options = {}) => {
                    const hasThaiChars = /[\u0E00-\u0E7F]/.test(text);
                    
                    if (hasThaiChars && useThaiFont) {
                        doc.font(options.bold ? 'ThaiBold' : 'ThaiRegular');
                    } else {
                        doc.font(options.bold ? this.fonts.english.bold : this.fonts.english.regular);
                        if (hasThaiChars) {
                            text = this.convertThaiToRoman(text);
                        }
                    }

                    return doc.text(text, x, y, options);
                };

                // Header
                doc.fillColor('#FF6B35');
                doc.rect(0, 0, doc.page.width, 80).fill();
                
                doc.fillColor('white');
                addText('🎤 Junrai Karaoke', 50, 25, { fontSize: 24, bold: true });

                // Booking confirmation title
                doc.fillColor('black');
                addText('ใบยืนยันการจอง / Booking Confirmation', 50, 100, { 
                    fontSize: 18, 
                    bold: true 
                });

                // Booking details
                const details = [
                    ['หมายเลขการจอง / Booking ID:', bookingData.bookingId],
                    ['วันที่จอง / Booking Date:', bookingData.bookingDate],
                    ['ลูกค้า / Customer:', bookingData.customerName],
                    ['ห้อง / Room:', bookingData.roomName],
                    ['วันที่ / Date:', bookingData.date],
                    ['เวลา / Time:', `${bookingData.startTime} - ${bookingData.endTime}`],
                    ['สถานะ / Status:', bookingData.status],
                    ['จำนวนเงิน / Amount:', `${bookingData.amount} บาท`]
                ];

                let yPosition = 140;
                details.forEach(([label, value]) => {
                    addText(label, 50, yPosition, { fontSize: 11 });
                    addText(value, 250, yPosition, { fontSize: 11, bold: true });
                    yPosition += 20;
                });

                // Instructions
                yPosition += 40;
                addText('หมายเหตุ / Notes:', 50, yPosition, { fontSize: 12, bold: true });
                yPosition += 25;

                const instructions = [
                    '• กรุณามาถึงก่อนเวลา 15 นาที / Please arrive 15 minutes early',
                    '• นำใบยืนยันนี้มาแสดงที่เคาน์เตอร์ / Present this confirmation at the counter',
                    '• การจองจะถูกยกเลิกหากมาสาย 30 นาที / Booking will be cancelled if 30+ minutes late',
                    '• สอบถามข้อมูลเพิ่มเติม โทร 02-xxx-xxxx / For inquiries, call 02-xxx-xxxx'
                ];

                instructions.forEach(instruction => {
                    addText(instruction, 50, yPosition, { fontSize: 10 });
                    yPosition += 15;
                });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = ThaiPDFGenerator;