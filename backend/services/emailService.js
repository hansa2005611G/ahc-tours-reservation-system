const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD
  }
});

// Send booking confirmation email
const sendBookingConfirmation = async (bookingData) => {
  try {
    const {
      passenger_email,
      passenger_name,
      booking_reference,
      journey_date,
      departure_time,
      origin,
      destination,
      seat_number,
      bus_number,
      total_amount,
      qr_code_base64
    } = bookingData;

    const mailOptions = {
      from: `"AHC Tours" <${config.EMAIL_USER}>`,
      to: passenger_email,
      subject: `Booking Confirmation - ${booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .ticket-info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #1a73e8; }
            .qr-code { text-align: center; padding: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            table { width: 100%; }
            td { padding: 8px 0; }
            .label { font-weight: bold; color: #1a73e8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚌 AHC Tours</h1>
              <h2>Booking Confirmation</h2>
            </div>
            
            <div class="content">
              <p>Dear ${passenger_name},</p>
              <p>Your bus ticket has been booked successfully!</p>
              
              <div class="ticket-info">
                <h3>Booking Details</h3>
                <table>
                  <tr>
                    <td class="label">Booking Reference:</td>
                    <td><strong>${booking_reference}</strong></td>
                  </tr>
                  <tr>
                    <td class="label">Journey Date:</td>
                    <td>${journey_date}</td>
                  </tr>
                  <tr>
                    <td class="label">Departure Time:</td>
                    <td>${departure_time}</td>
                  </tr>
                  <tr>
                    <td class="label">Route:</td>
                    <td>${origin} → ${destination}</td>
                  </tr>
                  <tr>
                    <td class="label">Bus Number:</td>
                    <td>${bus_number}</td>
                  </tr>
                  <tr>
                    <td class="label">Seat Number:</td>
                    <td><strong>${seat_number}</strong></td>
                  </tr>
                  <tr>
                    <td class="label">Total Amount:</td>
                    <td><strong>LKR ${total_amount}</strong></td>
                  </tr>
                </table>
              </div>
              
              <div class="qr-code">
                <h3>Your E-Ticket QR Code</h3>
                <p>Show this QR code to the conductor when boarding</p>
                <img src="${qr_code_base64}" alt="QR Code" style="max-width: 250px;" />
              </div>
              
              <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <strong>Important:</strong>
                <ul>
                  <li>Please arrive at the bus station 15 minutes before departure</li>
                  <li>Carry a valid ID proof for verification</li>
                  <li>This ticket is non-transferable</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing AHC Tours!</p>
              <p>For support, contact us at support@ahctours.lk or +94 11 234 5678</p>
              <p>&copy; 2026 AHC Tours. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

// Send payment confirmation email
const sendPaymentConfirmation = async (paymentData) => {
  try {
    const {
      passenger_email,
      passenger_name,
      booking_reference,
      amount,
      transaction_id
    } = paymentData;

    const mailOptions = {
      from: `"AHC Tours" <${config.EMAIL_USER}>`,
      to: passenger_email,
      subject: `Payment Confirmed - ${booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .success-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Successful</h1>
            </div>
            
            <div class="content">
              <p>Dear ${passenger_name},</p>
              
              <div class="success-box">
                <h2>Payment Confirmed!</h2>
                <p>Your payment has been processed successfully.</p>
                <p><strong>Amount Paid: LKR ${amount}</strong></p>
                <p>Transaction ID: ${transaction_id}</p>
                <p>Booking Reference: ${booking_reference}</p>
              </div>
              
              <p>Your e-ticket has been sent to you in a separate email.</p>
              <p>Have a safe journey!</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>&copy; 2026 AHC Tours. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Payment email error:', error);
    throw error;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendPaymentConfirmation
};