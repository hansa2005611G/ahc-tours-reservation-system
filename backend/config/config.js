require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3307,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'ahc_tours_db',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // Frontend URLs
  ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'http://localhost:3001',
  PASSENGER_WEBSITE_URL: process.env.PASSENGER_WEBSITE_URL || 'http://localhost:3000',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',

  // WhatsApp
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',

  // PayHere
  PAYHERE_MERCHANT_ID: process.env.PAYHERE_MERCHANT_ID || '',
  PAYHERE_MERCHANT_SECRET: process.env.PAYHERE_MERCHANT_SECRET || '',
  PAYHERE_RETURN_URL: process.env.PAYHERE_RETURN_URL || 'http://localhost:3000/payment/success',
  PAYHERE_CANCEL_URL: process.env.PAYHERE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  PAYHERE_NOTIFY_URL: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify'
};