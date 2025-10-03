const Stripe = require('stripe');
require('dotenv').config();

// ตรวจสอบว่ามี Stripe keys หรือไม่
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY ไม่ได้ตั้งค่าใน environment variables');
    console.warn('กรุณาเพิ่ม STRIPE_SECRET_KEY ในไฟล์ .env');
}

// สร้าง Stripe instance
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Stripe configuration
const stripeConfig = {
    // Test keys (ใช้สำหรับ development)
    testMode: process.env.NODE_ENV !== 'production',
    
    // Currency
    currency: 'thb', // Thai Baht
    
    // Supported payment methods
    paymentMethods: ['card', 'promptpay'],
    
    // Webhook settings
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    
    // Success/Cancel URLs
    successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success',
    cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
    
    // Publishable key for frontend
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
};

module.exports = {
    stripe,
    stripeConfig
};