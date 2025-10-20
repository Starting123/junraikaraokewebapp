const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        // ไม่ปฏิเสธ unauthorized certificates (ใช้สำหรับ development)
        rejectUnauthorized: false
    }
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * ส่งรหัส OTP 6 หลักสำหรับรีเซ็ตรหัสผ่าน
 */
async function sendResetPasswordOTP(to, otp) {
    const mailOptions = {
        from: `"Junrai Karaoke" <${process.env.SMTP_USER}>`,
        to,
        subject: 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - Junrai Karaoke',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Sarabun', Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #E07B39 0%, #D16C2A 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 40px 30px;
        }
        .otp-box {
            background: #f8f9fa;
            border: 2px dashed #E07B39;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 48px;
            font-weight: bold;
            color: #E07B39;
            letter-spacing: 8px;
            margin: 10px 0;
        }
        .info-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #E07B39;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎤 Junrai Karaoke</h1>
            <p>รีเซ็ตรหัสผ่าน</p>
        </div>
        <div class="content">
            <h2>สวัสดีค่ะ</h2>
            <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี Junrai Karaoke</p>
            <p>กรุณาใช้รหัส OTP ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:</p>
            
            <div class="otp-box">
                <p style="margin: 0; color: #666;">รหัส OTP ของคุณคือ</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #666; font-size: 14px;">รหัสนี้จะหมดอายุใน 15 นาที</p>
            </div>

            <div class="info-box">
                <strong>⚠️ คำเตือน:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>ห้ามแชร์รหัส OTP นี้กับผู้อื่น</li>
                    <li>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</li>
                    <li>รหัสนี้สามารถใช้ได้เพียงครั้งเดียวเท่านั้น</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${BASE_URL}/auth/reset-password" class="button">ไปที่หน้ารีเซ็ตรหัสผ่าน</a>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Junrai Karaoke. All rights reserved.</p>
            <p>หากคุณมีคำถาม กรุณาติดต่อเราที่ support@junraikaraoke.com</p>
        </div>
    </div>
</body>
</html>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${to}: ${otp}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        throw new Error('ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง');
    }
}

/**
 * ส่งลิงก์รีเซ็ตรหัสผ่าน (legacy method)
 */
async function sendResetPasswordEmail(to, token) {
    const resetUrl = `${BASE_URL}/auth/reset-password/${token}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject: 'Reset your password',
        html: `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    };
    return transporter.sendMail(mailOptions);
}

module.exports = {
    sendResetPasswordEmail,
    sendResetPasswordOTP
};
