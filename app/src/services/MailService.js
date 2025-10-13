const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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
    sendResetPasswordEmail
};
