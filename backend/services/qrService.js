const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/qrcodes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate QR Code for booking
const generateQRCode = async (bookingData) => {
  try {
    const { booking_reference, passenger_name, seat_number, journey_date, origin, destination } = bookingData;

    // QR Code data (JSON string)
    const qrData = JSON.stringify({
      booking_reference,
      passenger_name,
      seat_number,
      journey_date,
      origin,
      destination,
      verified: false
    });

    // Generate QR code as base64 string
    const qrCodeBase64 = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 1,
      width: 300
    });

    // Also save as file
    const fileName = `${booking_reference}.png`;
    const filePath = path.join(uploadsDir, fileName);
    
    await QRCode.toFile(filePath, qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 1,
      margin: 1,
      width: 300
    });

    return {
      qr_code_base64: qrCodeBase64,
      qr_code_url: `/uploads/qrcodes/${fileName}`,
      qr_code_path: filePath
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

// Verify QR Code data
const verifyQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    
    // Check required fields
    if (!data.booking_reference || !data.passenger_name || !data.seat_number) {
      return { valid: false, message: 'Invalid QR code data.' };
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, message: 'Invalid QR code format.' };
  }
};

module.exports = {
  generateQRCode,
  verifyQRCode
};