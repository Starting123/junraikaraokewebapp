const PDFDocument = require('pdfkit');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

// กำหนด moment ให้ใช้ภาษาไทย  
moment.locale('th');

/**
 * UnicodeReceiptService - สร้างใบเสร็จ PDF ที่รองรับภาษาไทยด้วย Unicode
 */
class UnicodeReceiptService {
    
    /**
     * สร้างใบเสร็จ PDF แบบ Unicode ที่รองรับไทย
     */
    static async generateReceipt(receiptData) {
        try {
            const { booking, user, payment, receiptNumber } = receiptData;

            // สร้างชื่อไฟล์ PDF พร้อม user_id เพื่อให้หาง่าย
            const userId = user.user_id || user.id || 'UNKNOWN';
            const fileName = `receipt_${receiptNumber}_U${userId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
            const receiptsDir = path.join(__dirname, '../../public/receipts');
            
            // สร้างโฟลเดอร์ถ้าไม่มี
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }
            
            const filePath = path.join(receiptsDir, fileName);

            // สร้าง PDF Document พร้อมตั้งค่า Unicode
            const doc = new PDFDocument({ 
                margin: 50,
                bufferPages: true,
                font: 'Helvetica' // เริ่มด้วย Helvetica ก่อน
            });
            
            doc.pipe(fs.createWriteStream(filePath));

            // ลองหาฟอนต์ที่รองรับภาษาไทย
            let thaiFont = null;
            const fontPaths = [
                'C:\\Windows\\Fonts\\thsarabunnew.ttf',
                'C:\\Windows\\Fonts\\tahoma.ttf', 
                'C:\\Windows\\Fonts\\arial.ttf',
                path.join(__dirname, '../assets/fonts/THSarabunNew.ttf')
            ];

            // ลองโหลดฟอนต์ไทย
            for (const fontPath of fontPaths) {
                try {
                    if (fs.existsSync(fontPath)) {
                        doc.registerFont('ThaiFont', fontPath);
                        thaiFont = 'ThaiFont';
                        console.log(`✅ โหลดฟอนต์ไทยสำเร็จ: ${fontPath}`);
                        break;
                    }
                } catch (e) {
                    console.log(`⚠️ ไม่สามารถโหลดฟอนต์: ${fontPath}`);
                }
            }

            // ถ้าไม่มีฟอนต์ไทย ใช้วิธี fallback
            const useThaiFont = thaiFont !== null;
            const headerFont = useThaiFont ? thaiFont : 'Helvetica-Bold';
            const bodyFont = useThaiFont ? thaiFont : 'Helvetica';

            // Header - ชื่อร้าน
            doc.fontSize(24)
               .font(headerFont)
               .text('JUNRAI KARAOKE', 50, 50, { align: 'center' });

            doc.fontSize(16)
               .font(bodyFont);

            if (useThaiFont) {
                doc.text('ใบเสร็จรับเงิน | RECEIPT', 50, 80, { align: 'center' });
            } else {
                doc.text('RECEIPT | KARAOKE BOOKING', 50, 80, { align: 'center' });
            }

            // เส้นคั่น
            doc.moveTo(50, 110)
               .lineTo(550, 110)
               .stroke();

            // ข้อมูลใบเสร็จ
            let y = 130;
            
            doc.fontSize(12)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text(`เลขที่ใบเสร็จ: ${receiptNumber}`, 50, y);
            } else {
                doc.text(`Receipt No: ${receiptNumber}`, 50, y);
            }
            
            y += 20;
            if (useThaiFont) {
                doc.text(`วันที่: ${moment().format('DD/MM/YYYY HH:mm')}`, 50, y);
            } else {
                doc.text(`Date: ${moment().format('DD/MM/YYYY HH:mm')}`, 50, y);
            }

            // ข้อมูลลูกค้า
            y += 40;
            doc.fontSize(14)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text('ข้อมูลลูกค้า', 50, y);
            } else {
                doc.text('Customer Information', 50, y);
            }
            
            y += 25;
            doc.fontSize(12)
               .font(bodyFont);
            
            if (useThaiFont) {
                doc.text(`รหัสลูกค้า: ${user.user_id}`, 50, y);
            } else {
                doc.text(`Customer ID: ${user.user_id}`, 50, y);
            }
            
            y += 15;
            if (useThaiFont) {
                doc.text(`ชื่อ: ${user.name}`, 50, y);
            } else {
                doc.text(`Name: ${user.name}`, 50, y);
            }
            
            y += 15;
            doc.text(`Email: ${user.email}`, 50, y);

            // ข้อมูลการจอง
            y += 40;
            doc.fontSize(14)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text('รายละเอียดการจอง', 50, y);
            } else {
                doc.text('Booking Details', 50, y);
            }
            
            y += 25;
            doc.fontSize(12)
               .font(bodyFont);
            
            if (useThaiFont) {
                doc.text(`รหัสการจอง: ${booking.booking_id}`, 50, y);
            } else {
                doc.text(`Booking ID: ${booking.booking_id}`, 50, y);
            }
            
            y += 15;
            if (useThaiFont) {
                doc.text(`ห้อง: ${booking.room_name} (${booking.type_name})`, 50, y);
            } else {
                doc.text(`Room: ${booking.room_name} (${booking.type_name})`, 50, y);
            }
            
            y += 15;
            if (useThaiFont) {
                doc.text(`เวลาเริ่ม: ${moment(booking.start_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            } else {
                doc.text(`Start Time: ${moment(booking.start_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            }
            
            y += 15;
            if (useThaiFont) {
                doc.text(`เวลาสิ้นสุด: ${moment(booking.end_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            } else {
                doc.text(`End Time: ${moment(booking.end_time).format('DD/MM/YYYY HH:mm')}`, 50, y);
            }
            
            y += 15;
            const duration = moment(booking.end_time).diff(moment(booking.start_time), 'hours', true);
            if (useThaiFont) {
                doc.text(`ระยะเวลา: ${duration} ชั่วโมง`, 50, y);
            } else {
                doc.text(`Duration: ${duration} hours`, 50, y);
            }

            // ข้อมูลการชำระเงิน
            y += 40;
            doc.fontSize(14)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text('รายละเอียดการชำระเงิน', 50, y);
            } else {
                doc.text('Payment Details', 50, y);
            }
            
            y += 25;
            doc.fontSize(12)
               .font(bodyFont)
               .text(`Payment Intent ID: ${payment.paymentIntentId}`, 50, y);
            
            y += 15;
            if (useThaiFont) {
                doc.text(`สถานะการชำระ: ${payment.status}`, 50, y);
            } else {
                doc.text(`Payment Status: ${payment.status}`, 50, y);
            }

            // ตารางราคา
            y += 30;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(12)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text('รายการ', 50, y)
                   .text('จำนวน', 300, y, { width: 80, align: 'center' })
                   .text('ราคา', 400, y, { width: 100, align: 'right' });
            } else {
                doc.text('Description', 50, y)
                   .text('Qty', 300, y, { width: 80, align: 'center' })
                   .text('Amount', 400, y, { width: 100, align: 'right' });
            }

            y += 20;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(11)
               .font(bodyFont);
            
            if (useThaiFont) {
                doc.text(`การจองห้อง ${booking.room_name}`, 50, y)
                   .text(`${duration} ชม.`, 300, y, { width: 80, align: 'center' })
                   .text(`${parseFloat(booking.total_price).toLocaleString()} บาท`, 400, y, { width: 100, align: 'right' });
            } else {
                doc.text(`Room Booking: ${booking.room_name}`, 50, y)
                   .text(`${duration} hrs`, 300, y, { width: 80, align: 'center' })
                   .text(`THB ${parseFloat(booking.total_price).toLocaleString()}`, 400, y, { width: 100, align: 'right' });
            }

            y += 25;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            // ยอดรวม
            y += 15;
            doc.fontSize(14)
               .font(headerFont);
            
            if (useThaiFont) {
                doc.text('ยอดรวมทั้งสิ้น:', 300, y)
                   .text(`${parseFloat(booking.total_price).toLocaleString()} บาท`, 400, y, { width: 100, align: 'right' });
            } else {
                doc.text('Total Amount:', 300, y)
                   .text(`THB ${parseFloat(booking.total_price).toLocaleString()}`, 400, y, { width: 100, align: 'right' });
            }

            // Footer
            y += 60;
            doc.fontSize(10)
               .font(bodyFont);
            
            if (useThaiFont) {
                doc.text('** ใบเสร็จนี้ออกโดยระบบอัตโนมัติ **', 50, y, { align: 'center' });
                y += 15;
                doc.text('หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อฝ่ายบริการลูกค้า', 50, y, { align: 'center' });
            } else {
                doc.text('** This receipt is automatically generated **', 50, y, { align: 'center' });
                y += 15;
                doc.text('For any questions, please contact customer service', 50, y, { align: 'center' });
            }

            // Footer line
            y += 30;
            doc.moveTo(50, y)
               .lineTo(550, y)
               .stroke();

            y += 15;
            doc.fontSize(9);
            if (useThaiFont) {
                doc.text('JUNRAI KARAOKE | ระบบจองห้องคาราโอเกะ', 50, y, { align: 'center' });
            } else {
                doc.text('JUNRAI KARAOKE SYSTEM | Auto-generated receipt', 50, y, { align: 'center' });
            }

            // Finalize PDF
            doc.end();

            return {
                success: true,
                filePath: filePath,
                fileName: fileName,
                receiptNumber: receiptNumber,
                thaiSupport: useThaiFont
            };

        } catch (error) {
            console.error('Error generating Unicode receipt:', error);
            throw new Error(`ไม่สามารถสร้างใบเสร็จได้: ${error.message}`);
        }
    }

    /**
     * สร้างเลขที่ใบเสร็จ
     */
    static generateReceiptNumber() {
        const now = moment();
        const timestamp = now.format('YYYYMMDDHHmmss');
        const random = Math.floor(Math.random() * 1000);
        return `RC${timestamp}${random.toString().padStart(3, '0')}`;
    }

    /**
     * ดึง URL สำหรับดาวน์โหลดใบเสร็จ
     */
    static getReceiptUrl(fileName) {
        return `/receipts/${fileName}`;
    }

    /**
     * ดึงที่อยู่ไฟล์ในระบบ
     */
    static getReceiptPath(fileName) {
        return path.join(__dirname, '../../public/receipts', fileName);
    }
}

module.exports = UnicodeReceiptService;