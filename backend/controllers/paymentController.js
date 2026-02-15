const crypto = require('crypto');
const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const qrService = require('../services/qrService');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const config = require('../config/config');

// @desc    Initiate payment
// @route   POST /api/payments/initiate
// @access  Private
const initiatePayment = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

    // Get booking details
    const booking = await bookingModel.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if user owns the booking
    if (req.user.user_id !== booking.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Check if already paid
    if (booking.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid.'
      });
    }

    // Generate payment data for PayHere
    const merchant_id = config.PAYHERE_MERCHANT_ID;
    const order_id = booking.booking_reference;
    const amount = parseFloat(booking.total_amount).toFixed(2);
    const currency = 'LKR';

    // Generate hash for PayHere
    const merchant_secret = config.PAYHERE_MERCHANT_SECRET;
    const hash_string = merchant_id + order_id + amount + currency + merchant_secret.toUpperCase();
    const hash = crypto.createHash('md5').update(hash_string).digest('hex').toUpperCase();

    // Payment data
    const paymentData = {
      merchant_id,
      return_url: config.PAYHERE_RETURN_URL,
      cancel_url: config.PAYHERE_CANCEL_URL,
      notify_url: config.PAYHERE_NOTIFY_URL,
      order_id,
      items: `Bus Ticket - ${booking.origin} to ${booking.destination}`,
      currency,
      amount,
      first_name: booking.passenger_name.split(' ')[0],
      last_name: booking.passenger_name.split(' ').slice(1).join(' ') || 'N/A',
      email: booking.passenger_email,
      phone: booking.passenger_phone,
      address: 'Sri Lanka',
      city: booking.origin,
      country: 'Sri Lanka',
      hash
    };

    res.json({
      success: true,
      message: 'Payment initialized.',
      data: { 
        payment: paymentData,
        sandbox: true // Set to false in production
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating payment.',
      error: error.message
    });
  }
};

// @desc    Handle PayHere payment notification
// @route   POST /api/payments/notify
// @access  Public (PayHere callback)
const handlePaymentNotification = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = req.body;

    console.log('📥 Payment notification received:', req.body);

    // Verify hash
    const merchant_secret = config.PAYHERE_MERCHANT_SECRET;
    const local_md5sig = crypto
      .createHash('md5')
      .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + merchant_secret.toUpperCase())
      .digest('hex')
      .toUpperCase();

    if (local_md5sig !== md5sig) {
      console.error('❌ Invalid payment hash');
      return res.status(400).send('Invalid hash');
    }

    // Get booking by reference
    const booking = await bookingModel.getBookingByReference(order_id);
    if (!booking) {
      console.error('❌ Booking not found:', order_id);
      return res.status(404).send('Booking not found');
    }

    // Create payment record
    const payment = await paymentModel.createPayment({
      booking_id: booking.booking_id,
      amount: payhere_amount,
      payment_method: 'PayHere',
      transaction_id: payment_id,
      status: status_code === '2' ? 'completed' : 'failed'
    });

    // If payment successful
    if (status_code === '2') {
      // Update booking payment status
      await bookingModel.updateBooking(booking.booking_id, {
        payment_status: 'completed'
      });

      // Generate QR Code
      const qrCode = await qrService.generateQRCode({
        booking_reference: booking.booking_reference,
        passenger_name: booking.passenger_name,
        seat_number: booking.seat_number,
        journey_date: booking.journey_date,
        origin: booking.origin,
        destination: booking.destination
      });

      // Update booking with QR code
      await bookingModel.updateBooking(booking.booking_id, {
        qr_code: qrCode.qr_code_base64
      });

      // Send confirmation email
      try {
        await emailService.sendBookingConfirmation({
          passenger_email: booking.passenger_email,
          passenger_name: booking.passenger_name,
          booking_reference: booking.booking_reference,
          journey_date: booking.journey_date,
          departure_time: booking.departure_time,
          origin: booking.origin,
          destination: booking.destination,
          seat_number: booking.seat_number,
          bus_number: booking.bus_number,
          total_amount: booking.total_amount,
          qr_code_base64: qrCode.qr_code_base64
        });
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
      }

      // Send WhatsApp notification
      try {
        await whatsappService.sendBookingConfirmationWhatsApp({
          passenger_phone: booking.passenger_phone,
          passenger_name: booking.passenger_name,
          booking_reference: booking.booking_reference,
          journey_date: booking.journey_date,
          departure_time: booking.departure_time,
          origin: booking.origin,
          destination: booking.destination,
          seat_number: booking.seat_number,
          bus_number: booking.bus_number
        });
      } catch (whatsappError) {
        console.error('❌ WhatsApp sending failed:', whatsappError);
      }

      console.log('✅ Payment completed and notifications sent');
    } else {
      // Payment failed
      await bookingModel.updateBooking(booking.booking_id, {
        payment_status: 'failed'
      });
      console.log('❌ Payment failed');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Payment notification error:', error);
    res.status(500).send('Error processing payment');
  }
};


// @desc    Verify payment manually (for testing)
// @route   POST /api/payments/verify/:bookingId
// @access  Public (for testing only)
const verifyPaymentManually = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking
    const booking = await bookingModel.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if already paid
    if (booking.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid.'
      });
    }

    // Create mock payment record
    const payment = await paymentModel.createPayment({
      booking_id: booking.booking_id,
      amount: booking.total_amount,
      payment_method: 'Manual',
      transaction_id: `MANUAL-${Date.now()}`,
      status: 'completed'
    });

    // Update booking status
    await bookingModel.updateBooking(booking.booking_id, {
      payment_status: 'completed'
    });

    // Generate QR Code
    const qrCode = await qrService.generateQRCode({
      booking_reference: booking.booking_reference,
      passenger_name: booking.passenger_name,
      seat_number: booking.seat_number,
      journey_date: booking.journey_date,
      origin: booking.origin,
      destination: booking.destination
    });

    // Update booking with QR code
    await bookingModel.updateBooking(booking.booking_id, {
      qr_code: qrCode.qr_code_base64
    });

    // Send confirmation email (optional - won't fail if email not configured)
    try {
      await emailService.sendBookingConfirmation({
        passenger_email: booking.passenger_email,
        passenger_name: booking.passenger_name,
        booking_reference: booking.booking_reference,
        journey_date: booking.journey_date,
        departure_time: booking.departure_time,
        origin: booking.origin,
        destination: booking.destination,
        seat_number: booking.seat_number,
        bus_number: booking.bus_number,
        total_amount: booking.total_amount,
        qr_code_base64: qrCode.qr_code_base64
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.log('⚠️ Email not sent (not configured):', emailError.message);
      // Don't fail the request if email fails
    }

    // Get updated booking
    const updatedBooking = await bookingModel.getBookingById(bookingId);

    res.json({
      success: true,
      message: 'Payment verified and ticket generated successfully.',
      data: {
        booking: updatedBooking,
        qr_code: qrCode.qr_code_base64
      }
    });
  } catch (error) {
    console.error('Manual payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment.',
      error: error.message
    });
  }
};

// @desc    Verify payment manually (for testing)
// @route   POST /api/payments/verify/:bookingId
// @access  Private/Admin
// const verifyPaymentManually = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     // Get booking
//     const booking = await bookingModel.getBookingById(bookingId);
//     if (!booking) {
//       return res.status(404).json({
//         success: false,
//         message: 'Booking not found.'
//       });
//     }

//     // Create mock payment record
//     const payment = await paymentModel.createPayment({
//       booking_id: booking.booking_id,
//       amount: booking.total_amount,
//       payment_method: 'Manual',
//       transaction_id: `MANUAL-${Date.now()}`,
//       status: 'completed'
//     });

//     // Update booking status
//     await bookingModel.updateBooking(booking.booking_id, {
//       payment_status: 'completed'
//     });

//     // Generate QR Code
//     const qrCode = await qrService.generateQRCode({
//       booking_reference: booking.booking_reference,
//       passenger_name: booking.passenger_name,
//       seat_number: booking.seat_number,
//       journey_date: booking.journey_date,
//       origin: booking.origin,
//       destination: booking.destination
//     });

//     // Update booking with QR code
//     await bookingModel.updateBooking(booking.booking_id, {
//       qr_code: qrCode.qr_code_base64
//     });

//     // Send confirmation email
//     try {
//       await emailService.sendBookingConfirmation({
//         passenger_email: booking.passenger_email,
//         passenger_name: booking.passenger_name,
//         booking_reference: booking.booking_reference,
//         journey_date: booking.journey_date,
//         departure_time: booking.departure_time,
//         origin: booking.origin,
//         destination: booking.destination,
//         seat_number: booking.seat_number,
//         bus_number: booking.bus_number,
//         total_amount: booking.total_amount,
//         qr_code_base64: qrCode.qr_code_base64
//       });
//     } catch (emailError) {
//       console.error('Email error:', emailError);
//     }

//     // Get updated booking
//     const updatedBooking = await bookingModel.getBookingById(bookingId);

//     res.json({
//       success: true,
//       message: 'Payment verified and ticket generated successfully.',
//       data: {
//         booking: updatedBooking,
//         qr_code: qrCode.qr_code_base64
//       }
//     });
//   } catch (error) {
//     console.error('Manual payment verification error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error verifying payment.',
//       error: error.message
//     });
//   }
// };

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
  try {
    const { status, payment_method } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (payment_method) filters.payment_method = payment_method;

    const payments = await paymentModel.getAllPayments(filters);

    res.json({
      success: true,
      count: payments.length,
      data: { payments }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments.',
      error: error.message
    });
  }
};

module.exports = {
  initiatePayment,
  handlePaymentNotification,
  verifyPaymentManually,
  getAllPayments
};