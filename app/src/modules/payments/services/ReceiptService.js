const PDFDocument = require('pdfkit');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

// กำหนด moment ให้ใช้ภาษาไทย
moment.locale('th');

/**
 * ReceiptService - สร้างใบเสร็จ PDF สำหรับการชำระเงิน
 */
class ReceiptService {
    
    /**
     * สร้างใบเสร็จ PDF
     * @param {Object} receiptData - ข้อมูลสำหรับใบเสร็จ
     * @returns {String} - path ไปยังไฟล์ PDF ที่สร้าง
     */
    static async generateReceipt(receiptData) {
        try {
            const {
                booking,
                user,
                payment,
                receiptNumber
            } = receiptData;

            // สร้างชื่อไฟล์ PDF พร้อม user_id เพื่อให้หาง่าย
            const userId = user.user_id || user.id || 'UNKNOWN';
            const fileName = `receipt_${receiptNumber}_U${userId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
            const receiptsDir = path.join(__dirname, '../../public/receipts');
            
            // สร้างโฟลเดอร์ถ้าไม่มี
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }
            
            const filePath = path.join(receiptsDir, fileName);

            // สร้าง PDF Document
            const doc = new PDFDocument({ 
                margin: 50,
                bufferPages: true
            });
            doc.pipe(fs.createWriteStream(filePath));

            // Header - ชื่อร้าน
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('JUNRAI KARAOKE', 50, 50, { align: 'center' });

            doc.fontSize(16)
               .font('Helvetica')
               .text('RECEIPT / KARAOKE BOOKING', 50, 80, { align: 'center' });

            // เส้นขั้น
            doc.moveTo(50, 110)
               .lineTo(550, 110)
               .stroke();

            // ข้อมูลใบเสร็จ
            let y = 130;
            
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(`Receipt No: ${receiptNumber}`, 50, y);
            
            y += 20;
            doc.text(`Date: ${moment().format('DD/MM/YYYY HH:mm')}`, 50, y);

            // ข้อมูลลูกค้า
            y += 40;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Customer Information', 50, y);
            
            y += 25;
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Customer ID: ${user.user_id}`, 50, y);
            
            y += 15;
            doc.text(`Name: ${user.name}`, 50, y);
            
            y += 15;
            doc.text(`Email: ${user.email}`, 50, y);

            // ข้อมูลการจอง
            y += 40;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Booking Details', 50, y);
            
            y += 25;
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Booking ID: ${booking.booking_id}`, 50, y);
            
            y += 15;
            doc.text(`Room: ${booking.room_name} (${booking.type_name})`, 50, y);
            
            y += 15;
            doc.text(`Start Time: ${moment(booking.start_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            
            y += 15;
            doc.text(`End Time: ${moment(booking.end_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            
            y += 15;
            const duration = moment(booking.end_time).diff(moment(booking.start_time), 'hours', true);
            doc.text(`Duration: ${duration} hours`, 50, y);

            // ข้อมูลการชำระเงิน
            y += 40;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Payment Details', 50, y);
            
            y += 25;
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Payment Intent ID: ${payment.paymentIntentId}`, 50, y);
            
            y += 15;
            doc.text(`Payment Status: ${payment.status}`, 50, y);

            // ตารางราคา
            y += 30;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Description', 50, y)
               .text('Qty', 300, y, { width: 80, align: 'center' })
               .text('Amount', 400, y, { width: 100, align: 'right' });

            y += 20;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(11)
               .font('Helvetica')
               .text(`Room Booking: ${booking.room_name}`, 50, y)
               .text(`${duration} hrs`, 300, y, { width: 80, align: 'center' })
               .text(`THB ${parseFloat(booking.total_price).toLocaleString()}`, 400, y, { width: 100, align: 'right' });

            y += 25;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            // ยอดรวม
            y += 15;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Total Amount:', 300, y)
               .text(`THB ${parseFloat(booking.total_price).toLocaleString()}`, 400, y, { width: 100, align: 'right' });

            // ข้อมูล QR Code หรือ Barcode (อาจเพิ่มได้ในอนาคต)
            y += 60;
            doc.fontSize(10)
               .font('Helvetica')
               .text('** This receipt is automatically generated **', 50, y, { align: 'center' });

            y += 15;
            doc.text('For any questions or concerns, please contact customer service', 50, y, { align: 'center' });

            // Footer
            y += 30;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(9)
               .text('JUNRAI KARAOKE SYSTEM | Auto-generated receipt', 50, y, { align: 'center' });

            // Finalize PDF
            doc.end();

            return {
                success: true,
                filePath: filePath,
                fileName: fileName,
                receiptNumber: receiptNumber
            };

        } catch (error) {
            console.error('Error generating receipt:', error);
            throw error;
        }
    }

    /**
     * สร้างเลขใบเสร็จ
     */
    static generateReceiptNumber() {
        const now = moment();
        const dateStr = now.format('YYYYMMDD');
        const timeStr = now.format('HHmmss');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `RC${dateStr}${timeStr}${random}`;
    }

    /**
     * ดาวน์โหลดใบเสร็จ
     */
    static getReceiptPath(fileName) {
        return path.join(__dirname, '../../public/receipts', fileName);
    }

    /**
     * ดึง URL สำหรับดาวน์โหลดใบเสร็จ
     */
    static getReceiptUrl(fileName) {
        return `/receipts/${fileName}`;
    }
}

module.exports = ReceiptService;