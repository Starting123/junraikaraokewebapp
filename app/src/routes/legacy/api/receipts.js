const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// API สำหรับดูใบเสร็จ (ตามแนวคิดตัวอย่าง)
router.get('/view/:receiptNumber', async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        const receiptPath = path.join(__dirname, '../../../../public/receipts');
        
        // หาไฟล์ใบเสร็จที่มีเลขที่ตรงกัน
        const files = fs.readdirSync(receiptPath);
        const receiptFile = files.find(file => file.includes(receiptNumber));
        
        if (!receiptFile) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบใบเสร็จ'
            });
        }
        
        const filePath = path.join(receiptPath, receiptFile);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${receiptFile}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error viewing receipt:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแสดงใบเสร็จ'
        });
    }
});

// API เพื่อสร้างใบเสร็จ Unicode ทดสอบ
router.post('/generate-unicode', async (req, res) => {
    try {
        const UnicodeReceiptService = require('../../../services/UnicodeReceiptService');
        
        // ข้อมูลทดสอบ
        const testBookingData = {
            booking: {
                booking_id: Math.floor(Math.random() * 100000),
                room_name: 'ห้อง VIP A',
                type_name: 'Premium',
                total_price: 1500.00,
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours later
            },
            user: {
                user_id: 1,
                name: 'สมชาย ใจดี',
                email: 'somchai@example.com'
            },
            payment: {
                paymentIntentId: 'pi_test' + Date.now(),
                status: 'succeeded'
            },
            receiptNumber: UnicodeReceiptService.generateReceiptNumber()
        };
        
        // สร้างใบเสร็จ
        const receiptResult = await UnicodeReceiptService.generateReceipt(testBookingData);
        
        res.json({
            success: true,
            message: 'สร้างใบเสร็จภาษาไทยเสร็จสิ้น',
            receipt: receiptResult,
            testData: testBookingData
        });
        
    } catch (error) {
        console.error('Error generating Unicode test receipt:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างใบเสร็จทดสอบ',
            error: error.message
        });
    }
});

// API เพื่อดูรายการไฟล์ใบเสร็จ
router.get('/list', (req, res) => {
    try {
        const receiptsDir = path.join(__dirname, '../../../public/receipts');
        
        if (!fs.existsSync(receiptsDir)) {
            return res.json({ 
                success: false, 
                message: 'โฟลเดอร์ receipts ไม่พบ',
                files: [] 
            });
        }

        const files = fs.readdirSync(receiptsDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => {
                const filePath = path.join(receiptsDir, file);
                const stats = fs.statSync(filePath);
                
                return {
                    fileName: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    downloadUrl: `/receipts/${file}`
                };
            });

        res.json({
            success: true,
            message: `พบไฟล์ ${files.length} ไฟล์`,
            files: files
        });

    } catch (error) {
        console.error('Error listing receipts:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอ่านไฟล์',
            error: error.message
        });
    }
});

module.exports = router;