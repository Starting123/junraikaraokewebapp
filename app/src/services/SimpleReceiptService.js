const PDFDocument = require('pdfkit');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

moment.locale('th');

/**
 * SimpleReceiptService - ใบเสร็จแบบง่ายๆ ตามแนวคิดของตัวอย่าง
 */
class SimpleReceiptService {
    
    static async generateSimpleReceipt(receiptData) {
        try {
            const { booking, user, payment, receiptNumber } = receiptData;
            
            // สร้างชื่อไฟล์แบบมาตรฐาน พร้อม user_id เพื่อให้หาง่าย
            const userId = user.user_id || user.id || 'UNKNOWN';
            const fileName = `receipt_${receiptNumber}_U${userId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
            const receiptsDir = path.join(__dirname, '../../public/receipts');
            
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }
            
            const filePath = path.join(receiptsDir, fileName);

            // สร้าง PDF Document แบบง่าย
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
            });
            
            doc.pipe(fs.createWriteStream(filePath));

            // ลองใช้ฟอนต์ไทยจากโฟลเดอร์ assets/fonts
            let thaiFont = 'Helvetica';
            let hasThaiFont = false;
            
            // path ไปยัง fonts ที่เราย้ายมาแล้ว
            const appRoot = path.join(__dirname, '..', '..');
            
            // ลิสต์ฟอนต์ไทยใน assets/fonts และ fallback ใน Windows
            const thaiFontPaths = [
                path.join(appRoot, 'assets', 'fonts', 'THSarabun.ttf'),
                path.join(appRoot, 'assets', 'fonts', 'THSarabun Bold.ttf'),
                'C:\\Windows\\Fonts\\tahoma.ttf',
                'C:\\Windows\\Fonts\\arial.ttf',
                'C:\\Windows\\Fonts\\cordia.ttf'
            ];
            
            console.log(`🔍 กำลังหาฟอนต์ไทยจาก: ${appRoot}/assets/fonts/`);
            
            // ลองโหลดฟอนต์ทั้ง regular และ bold
            let fontLoaded = false;
            
            // ลองโหลด THSarabun Regular
            const regularFont = path.join(appRoot, 'assets', 'fonts', 'THSarabun.ttf');
            if (fs.existsSync(regularFont)) {
                try {
                    doc.registerFont('THSarabun', regularFont);
                    thaiFont = 'THSarabun';
                    fontLoaded = true;
                    console.log(`✅ โหลดฟอนต์ไทยปกติสำเร็จ: ${regularFont}`);
                } catch (e) {
                    console.log(`❌ ไม่สามารถโหลดฟอนต์ปกติ: ${e.message}`);
                }
            }
            
            // ลองโหลด THSarabun Bold
            const boldFont = path.join(appRoot, 'assets', 'fonts', 'THSarabun Bold.ttf');
            if (fs.existsSync(boldFont)) {
                try {
                    doc.registerFont('THSarabun-Bold', boldFont);
                    console.log(`✅ โหลดฟอนต์ไทยหนาสำเร็จ: ${boldFont}`);
                } catch (e) {
                    console.log(`❌ ไม่สามารถโหลดฟอนต์หนา: ${e.message}`);
                }
            }
            
            // ถ้าโหลดไม่ได้เลย ลอง fallback
            if (!fontLoaded) {
                for (const fontPath of thaiFontPaths.slice(2)) { // ข้าม 2 อันแรกเพราะลองแล้ว
                    try {
                        if (fs.existsSync(fontPath)) {
                            doc.registerFont('THSarabun', fontPath);
                            thaiFont = 'THSarabun';
                            hasThaiFont = true;
                            console.log(`✅ โหลดฟอนต์ fallback สำเร็จ: ${fontPath}`);
                            break;
                        }
                    } catch (e) {
                        console.log(`❌ ไม่สามารถโหลด fallback: ${fontPath} - ${e.message}`);
                    }
                }
            } else {
                hasThaiFont = true;
            }
            
            if (!hasThaiFont) {
                console.log('🔧 ใช้ฟอนต์ Helvetica (ไม่พบฟอนต์ไทย)');
            }

            // Header - ข้อมูลร้าน (ปรับปรุงตามแนวคิดตัวอย่าง)
            doc.font(thaiFont);
            doc.fontSize(18);
            doc.text('Jun Rai Karaoke', { align: 'center' });
            
            // ใช้ฟอนต์ไทยสำหรับข้อความไทย
            doc.font(thaiFont);
            doc.fontSize(16);
            doc.text('ห้องคาราโอเกะจันไร', { align: 'center' });
            
            doc.fontSize(12);
            doc.text('39 หมู่ที่ 1 ถนนรังสิต - นครนายก ตำบล คลองหก อำเภอคลองหลวง ปทุมธานี 12110', { align: 'center' });
            doc.text('โทรศัพท์: 02-123-4567 | LINE: @junraikaraoke', { align: 'center' });
            doc.text('เลขประจำตัวผู้เสียภาษี: 0123456789012', { align: 'center' });
            
            doc.moveDown(2);
            
            // ชื่อใบเสร็จ
            doc.fontSize(20).font(thaiFont);
            doc.text('ใบเสร็จรับเงิน / Receipt', { align: 'center', underline: true });
            doc.fontSize(16);
            doc.text(`เลขที่ ${receiptNumber}`, { align: 'center' });

            doc.moveDown(1.5);

            // ข้อมูลลูกค้า
            doc.font(thaiFont);
            doc.fontSize(14);
            doc.text(`ชื่อลูกค้า: ${user.name || 'ไม่ระบุ'}`);
            doc.text(`อีเมล: ${user.email || 'ไม่ระบุ'}`);
            doc.text(`วันที่ออกใบเสร็จ: ${moment().format('DD/MM/YYYY เวลา HH:mm:ss น.')}`);
            
            if (booking.booking_date) {
                doc.text(`วันที่จอง: ${moment(booking.booking_date).format('DD/MM/YYYY')}`);
            }

            doc.moveDown();

            // รายการบริการ
            doc.fontSize(16).text('รายการบริการ', { underline: true });
            
            // หัวตาราง
            const tableTop = 270;
            doc.fontSize(16);
            doc.text('รายการ', 100, tableTop, { width: 200, align: 'left' });
            doc.text('ห้อง', 200, tableTop, { width: 100, align: 'center' });
            doc.text('เวลา', 300, tableTop, { width: 100, align: 'center' });
            doc.text('ราคา', 400, tableTop, { width: 100, align: 'right' });

            // ข้อมูลบริการ
            const itemY = tableTop + 30;
            doc.fontSize(14);
            doc.text('การจองห้องคาราโอเกะ', 100, itemY, { width: 200, align: 'left' });
            doc.text(booking.room_name || 'ห้อง VIP', 200, itemY, { width: 100, align: 'center' });
            doc.text(`${booking.duration_hours || 1} ชั่วโมง`, 300, itemY, { width: 100, align: 'center' });
            doc.text(`${booking.total_price || 0} บาท`, 400, itemY, { width: 100, align: 'right' });

            // ยอดรวม
            doc.moveDown(3);
            doc.fontSize(18);
            doc.text(`ยอดรวม: ${booking.total_price || 0} บาท`, 400, doc.y, { 
                width: 100, 
                align: 'right' 
            });

            // Footer
            doc.moveDown(2);
            doc.fontSize(14);
            doc.text('*** ขอบคุณที่ใช้บริการ ***', { align: 'center' });
            doc.text('JUNRAI KARAOKE', { align: 'center' });

            doc.end();

            console.log('✅ สร้างใบเสร็จแบบง่ายสำเร็จ:', fileName);

            return {
                success: true,
                fileName: fileName,
                filePath: filePath,
                downloadUrl: `/receipts/${fileName}`,
                receiptNumber: receiptNumber,
                thaiSupport: hasThaiFont
            };

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการสร้างใบเสร็จ:', error);
            throw error;
        }
    }

    /**
     * สร้างเลขที่ใบเสร็จแบบมีมาตรฐาน (เหมือน services อื่นๆ)
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
}

module.exports = SimpleReceiptService;