const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Generate QR code image tag for email
const getQRCodeImageTag = (qrCodeBase64) => {
  if (!qrCodeBase64) return '';
  return `<img src="${qrCodeBase64}" alt="QR Code" style="max-width: 250px; border: 3px solid #667eea; border-radius: 8px; padding: 10px; background: white;">`;
};

// Send booking confirmation email
const sendBookingConfirmation = async (bookingData) => {
  try {
    const transporter = createTransporter();

    const {
      passenger_email,
      passenger_name,
      booking_reference,
      journey_date,
      departure_time,
      arrival_time,
      origin,
      destination,
      seat_number,
      bus_number,
      bus_type,
      total_amount,
      qr_code_base64
    } = bookingData;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .ticket { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; color: #666; }
    .info-value { color: #333; }
    .route { text-align: center; font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; }
    .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #fff; border-radius: 10px; }
    .important { background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚌 Booking Confirmed!</h1>
      <p style="margin: 10px 0 0;">AHC Tours</p>
    </div>
    
    <div class="content">
      <h2>Hi ${passenger_name}! 👋</h2>
      <p>Your bus ticket has been successfully booked. Here are your journey details:</p>
      
      <div class="ticket">
        <h3 style="color: #667eea; margin-top: 0;">Booking Reference</h3>
        <p style="font-size: 24px; font-weight: bold; color: #333; font-family: monospace;">${booking_reference}</p>
        
        <div class="route">${origin} → ${destination}</div>
        
        <div class="info-row">
          <span class="info-label">Journey Date:</span>
          <span class="info-value">${new Date(journey_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Departure Time:</span>
          <span class="info-value">${departure_time}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Arrival Time:</span>
          <span class="info-value">${arrival_time}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Bus Number:</span>
          <span class="info-value">${bus_number} (${bus_type})</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Seat Number:</span>
          <span class="info-value"><strong style="color: #667eea; font-size: 18px;">${seat_number}</strong></span>
        </div>
        
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Total Amount Paid:</span>
          <span class="info-value"><strong style="color: #4caf50; font-size: 18px;">LKR ${total_amount}</strong></span>
        </div>
      </div>
      
      ${qr_code_base64 ? `
      <div class="qr-section">
        <h3 style="color: #667eea;">Your E-Ticket QR Code</h3>
        <p>Show this QR code to the conductor when boarding:</p>
        ${getQRCodeImageTag(qr_code_base64)}
      </div>
      ` : ''}
      
      <div class="important">
        <h4 style="margin-top: 0; color: #f57c00;">📌 Important Information</h4>
        <ul style="margin: 10px 0;">
          <li>Please arrive at the bus station <strong>15 minutes before departure</strong></li>
          <li>Carry a valid photo ID for verification</li>
          <li>Show the QR code to the conductor when boarding</li>
          <li>Keep this email for your records</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.PASSENGER_WEBSITE_URL}/my-bookings" class="button">View My Bookings</a>
      </div>
      
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Thank you for choosing AHC Tours! 🚌</p>
    </div>
    
    <div class="footer">
      <p>This is an automated email. Please do not reply to this email.</p>
      <p>&copy; 2026 AHC Tours. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: passenger_email,
      subject: `✅ Booking Confirmed - ${booking_reference} | AHC Tours`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

// Send payment confirmation email
const sendPaymentConfirmation = async (paymentData) => {
  try {
    const transporter = createTransporter();

    const {
      passenger_email,
      passenger_name,
      booking_reference,
      transaction_id,
      amount,
      payment_method,
      payment_date
    } = paymentData;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .receipt { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Successful!</h1>
    </div>
    
    <div class="content">
      <h2>Hi ${passenger_name}!</h2>
      <p>Your payment has been successfully processed.</p>
      
      <div class="receipt">
        <h3 style="color: #4caf50;">Payment Receipt</h3>
        
        <div class="info-row">
          <span><strong>Transaction ID:</strong></span>
          <span style="font-family: monospace;">${transaction_id}</span>
        </div>
        
        <div class="info-row">
          <span><strong>Booking Reference:</strong></span>
          <span>${booking_reference}</span>
        </div>
        
        <div class="info-row">
          <span><strong>Amount Paid:</strong></span>
          <span style="color: #4caf50; font-size: 18px;"><strong>LKR ${amount}</strong></span>
        </div>
        
        <div class="info-row">
          <span><strong>Payment Method:</strong></span>
          <span>${payment_method}</span>
        </div>
        
        <div class="info-row" style="border-bottom: none;">
          <span><strong>Payment Date:</strong></span>
          <span>${new Date(payment_date).toLocaleString()}</span>
        </div>
      </div>
      
      <p>Your e-ticket has been sent in a separate email.</p>
      <p>Thank you for your payment!</p>
    </div>
    
    <div class="footer">
      <p>&copy; 2026 AHC Tours. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: passenger_email,
      subject: `💳 Payment Confirmed - ${booking_reference} | AHC Tours`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Payment email error:', error);
    throw error;
  }
};

// Send cancellation notification email
const sendCancellationNotification = async (cancellationData) => {
  try {
    const transporter = createTransporter();

    const {
      passenger_email,
      passenger_name,
      booking_reference,
      status,
      admin_remarks,
      refund_amount
    } = cancellationData;

    const isApproved = status === 'approved';
    const headerColor = isApproved ? '#4caf50' : '#f44336';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const statusIcon = isApproved ? '✅' : '❌';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .info-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusIcon} Cancellation ${statusText}</h1>
    </div>
    
    <div class="content">
      <h2>Hi ${passenger_name}!</h2>
      <p>Your cancellation request for booking <strong>${booking_reference}</strong> has been <strong>${statusText.toLowerCase()}</strong>.</p>
      
      ${isApproved ? `
      <div class="info-box">
        <h3 style="color: #4caf50;">Refund Information</h3>
        <p><strong>Refund Amount:</strong> <span style="color: #4caf50; font-size: 20px;">LKR ${refund_amount}</span></p>
        <p>The refund will be processed within 5-7 business days to your original payment method.</p>
      </div>
      ` : `
      <div class="info-box">
        <h3 style="color: #f44336;">Reason for Rejection</h3>
        <p>${admin_remarks || 'Please contact support for more information.'}</p>
      </div>
      `}
      
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you for using AHC Tours!</p>
    </div>
    
    <div class="footer">
      <p>&copy; 2026 AHC Tours. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: passenger_email,
      subject: `${statusIcon} Cancellation ${statusText} - ${booking_reference} | AHC Tours`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Cancellation notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Cancellation email error:', error);
    throw error;
  }
};

// Send admin notification for new cancellation request
const sendAdminCancellationAlert = async (cancellationData) => {
  try {
    const transporter = createTransporter();

    const {
      booking_reference,
      passenger_name,
      passenger_email,
      reason,
      journey_date,
      origin,
      destination
    } = cancellationData;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Cancellation Request</h1>
    </div>
    
    <div class="content">
      <h2>Action Required</h2>
      <p>A new cancellation request has been submitted and requires your attention.</p>
      
      <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p><strong>Booking Reference:</strong> ${booking_reference}</p>
        <p><strong>Passenger:</strong> ${passenger_name} (${passenger_email})</p>
        <p><strong>Route:</strong> ${origin} → ${destination}</p>
        <p><strong>Journey Date:</strong> ${new Date(journey_date).toLocaleDateString()}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.ADMIN_PANEL_URL}/cancellations" class="button">Review Request</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to admin email
      subject: `🔔 New Cancellation Request - ${booking_reference}`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin cancellation alert sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Admin alert email error:', error);
    throw error;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendCancellationNotification,
  sendAdminCancellationAlert
};