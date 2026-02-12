const axios = require('axios');
const config = require('../config/config');

// Send WhatsApp message via WhatsApp Business API
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Remove + and spaces from phone number
    const cleanPhone = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp error:', error.response?.data || error.message);
    // Don't throw error - just log it (WhatsApp is optional)
    return { success: false, error: error.message };
  }
};

// Send booking confirmation via WhatsApp
const sendBookingConfirmationWhatsApp = async (bookingData) => {
  const {
    passenger_phone,
    passenger_name,
    booking_reference,
    journey_date,
    departure_time,
    origin,
    destination,
    seat_number,
    bus_number
  } = bookingData;

  const message = `
🚌 *AHC Tours - Booking Confirmed*

Dear ${passenger_name},

Your bus ticket has been booked successfully!

*Booking Details:*
📌 Reference: ${booking_reference}
📅 Date: ${journey_date}
🕐 Time: ${departure_time}
🚏 Route: ${origin} → ${destination}
🚌 Bus: ${bus_number}
💺 Seat: ${seat_number}

Please arrive 15 minutes before departure.
Show your QR code to the conductor when boarding.

Thank you for choosing AHC Tours!
  `.trim();

  return await sendWhatsAppMessage(passenger_phone, message);
};

module.exports = {
  sendWhatsAppMessage,
  sendBookingConfirmationWhatsApp
};