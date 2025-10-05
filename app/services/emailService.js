/**
 * Email Service for Junrai Karaoke System
 * Handles sending password reset emails using nodemailer
 */

const nodemailer = require('nodemailer');

// Email configuration - Use environment variables in production
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Create transporter
const transporter = nodemailer.createTransporter({
  ...EMAIL_CONFIG,
  // Gmail specific settings
  service: 'gmail',
  auth: {
    user: EMAIL_CONFIG.auth.user,
    pass: EMAIL_CONFIG.auth.pass
  }
});

// Verify connection configuration
async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error.message);
    return false;
  }
}

// Email templates
function getPasswordResetEmailTemplate(userName, resetUrl) {
  return {
    html: `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รีเซ็ตรหัสผ่าน - Junrai Karaoke</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .email-card {
            background: #fff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            color: #d2691e;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .title {
            color: #333;
            font-size: 22px;
            margin-bottom: 20px;
          }
          .content {
            font-size: 16px;
            line-height: 1.8;
            color: #555;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #d2691e, #a0522d);
            color: white !important;
            padding: 14px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
            transition: all 0.3s ease;
          }
          .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(210, 105, 30, 0.3);
          }
          .security-info {
            background: #f8f9fa;
            border-left: 4px solid #d2691e;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #777;
          }
          .expiry-warning {
            color: #e74c3c;
            font-weight: bold;
          }
          @media (max-width: 600px) {
            .container { padding: 10px; }
            .email-card { padding: 20px; }
            .title { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-card">
            <div class="header">
              <div class="logo">🎤 Junrai Karaoke</div>
              <h1 class="title">รีเซ็ตรหัสผ่านของคุณ</h1>
            </div>
            
            <div class="content">
              <p>สวัสดีคุณ <strong>${userName}</strong>,</p>
              
              <p>เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของคุณในระบบ Junrai Karaoke</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">
                  รีเซ็ตรหัสผ่านตอนนี้
                </a>
              </p>
              
              <div class="security-info">
                <h4>🔒 ข้อมูลด้านความปลอดภัย:</h4>
                <ul>
                  <li class="expiry-warning">ลิงก์นี้จะหมดอายุใน 15 นาที</li>
                  <li>ใช้ได้เพียงครั้งเดียวเท่านั้น</li>
                  <li>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</li>
                </ul>
              </div>
              
              <p>หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกลิงก์นี้และวางในเบราว์เซอร์:</p>
              <p style="word-break: break-all; color: #007bff;">
                ${resetUrl}
              </p>
              
              <p>หากคุณมีปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมสนับสนุนของเรา</p>
            </div>
            
            <div class="footer">
              <p><strong>Junrai Karaoke Management System</strong></p>
              <p>เปิดให้บริการ: อังคาร - อาทิตย์ (11.00 - 21.00)</p>
              <p><em>อีเมลนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
รีเซ็ตรหัสผ่าน - Junrai Karaoke

สวัสดีคุณ ${userName},

เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ

กรุณาคลิกลิงก์นี้เพื่อรีเซ็ตรหัสผ่าน:
${resetUrl}

ข้อมูลด้านความปลอดภัย:
- ลิงก์นี้จะหมดอายุใน 15 นาที
- ใช้ได้เพียงครั้งเดียวเท่านั้น
- หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

Junrai Karaoke Management System
เปิดให้บริการ: อังคาร - อาทิตย์ (11.00 - 21.00)
    `
  };
}

/**
 * Send password reset email
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - User's name
 * @param {string} resetToken - Password reset token
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordResetEmail(toEmail, userName, resetToken, baseUrl = 'http://localhost:3000') {
  try {
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
    const { html, text } = getPasswordResetEmailTemplate(userName, resetUrl);
    
    const mailOptions = {
      from: `"Junrai Karaoke" <${EMAIL_CONFIG.auth.user}>`,
      to: toEmail,
      subject: '🔐 รีเซ็ตรหัสผ่าน - Junrai Karaoke',
      text: text,
      html: html,
      // Add headers for better deliverability
      headers: {
        'X-Mailer': 'Junrai Karaoke System',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      }
    };
    
    console.log(`📧 Sending password reset email to: ${toEmail}`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', {
      error: error.message,
      stack: error.stack,
      recipient: toEmail
    });
    return false;
  }
}

/**
 * Send test email to verify configuration
 */
async function sendTestEmail(toEmail) {
  try {
    const mailOptions = {
      from: `"Junrai Karaoke" <${EMAIL_CONFIG.auth.user}>`,
      to: toEmail,
      subject: '🧪 Test Email - Junrai Karaoke',
      html: `
        <h2>🎤 Email Service Test</h2>
        <p>This is a test email from Junrai Karaoke system.</p>
        <p>If you receive this email, the email service is working correctly!</p>
        <p><em>Sent at: ${new Date().toLocaleString('th-TH')}</em></p>
      `,
      text: 'This is a test email from Junrai Karaoke system.'
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendTestEmail,
  verifyEmailConnection
};