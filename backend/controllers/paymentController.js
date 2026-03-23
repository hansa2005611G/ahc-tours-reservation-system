const crypto = require('crypto');
const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const qrService = require('../services/qrService');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const config = require('../config/config');

const md5 = (value) => crypto.createHash('md5').update(value).digest('hex').toUpperCase();

const getMerchantSecretHash = () => md5(config.PAYHERE_MERCHANT_SECRET || '');

// PayHere initiate hash format:
// md5(merchant_id + order_id + amount + currency + md5(merchant_secret))
const generateInitiateHash = ({ merchant_id, order_id, amount, currency }) => {
  return md5(`${merchant_id}${order_id}${amount}${currency}${getMerchantSecretHash()}`);
};

// PayHere notify signature format:
// md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(merchant_secret))
const generateNotifySignature = ({ merchant_id, order_id, payhere_amount, payhere_currency, status_code }) => {
  return md5(
    `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${getMerchantSecretHash()}`
  );
};

const finalizeSuccessfulPayment = async (booking, paymentId = null) => {
  // Mark booking as paid + card method + paid timestamp
  await bookingModel.updateBooking(booking.booking_id, {
    payment_status: 'completed',
    payment_method: 'card_payhere',
    transaction_id: paymentId || booking.transaction_id || null,
    paid_at: new Date()
  });

  // Generate QR if not already available
  let qrBase64 = booking.qr_code;
  if (!qrBase64) {
    const qrCode = await qrService.generateQRCode({
      booking_reference: booking.booking_reference,
      passenger_name: booking.passenger_name,
      seat_number: booking.seat_number,
      journey_date: booking.journey_date || booking.schedule_journey_date,
      origin: booking.origin,
      destination: booking.destination
    });

    qrBase64 = qrCode.qr_code_base64;

    await bookingModel.updateBooking(booking.booking_id, {
      qr_code: qrBase64
    });
  }

  const updatedBooking = await bookingModel.getBookingById(booking.booking_id);

  // Send email (non-blocking)
  try {
    await emailService.sendBookingConfirmation({
      passenger_email: updatedBooking.passenger_email,
      passenger_name: updatedBooking.passenger_name,
      booking_reference: updatedBooking.booking_reference,
      journey_date: updatedBooking.journey_date || updatedBooking.schedule_journey_date,
      departure_time: updatedBooking.departure_time,
      arrival_time: updatedBooking.arrival_time,
      origin: updatedBooking.origin,
      destination: updatedBooking.destination,
      seat_number: updatedBooking.seat_number,
      bus_number: updatedBooking.bus_number,
      bus_type: updatedBooking.bus_type,
      total_amount: updatedBooking.total_amount,
      qr_code_base64: qrBase64
    });
    console.log('✅ Booking confirmation email sent:', updatedBooking.passenger_email);
  } catch (emailError) {
    console.error('❌ Email sending failed:', emailError.message);
  }

  // Send WhatsApp (non-blocking)
  try {
    await whatsappService.sendBookingConfirmationWhatsApp({
      passenger_phone: updatedBooking.passenger_phone,
      passenger_name: updatedBooking.passenger_name,
      booking_reference: updatedBooking.booking_reference,
      journey_date: updatedBooking.journey_date || updatedBooking.schedule_journey_date,
      departure_time: updatedBooking.departure_time,
      origin: updatedBooking.origin,
      destination: updatedBooking.destination,
      seat_number: updatedBooking.seat_number,
      bus_number: updatedBooking.bus_number
    });
  } catch (whatsappError) {
    console.error('❌ WhatsApp sending failed:', whatsappError.message);
  }

  return updatedBooking;
};

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

    if (!config.PAYHERE_MERCHANT_ID || !config.PAYHERE_MERCHANT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'PayHere configuration is missing.'
      });
    }

    const booking = await bookingModel.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Owner or admin check
    if (req.user.user_id !== booking.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    if (booking.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid.'
      });
    }

    const merchant_id = config.PAYHERE_MERCHANT_ID;
    const order_id = booking.booking_reference;
    const amount = Number(booking.total_amount).toFixed(2);
    const currency = 'LKR';

    const hash = generateInitiateHash({
      merchant_id,
      order_id,
      amount,
      currency
    });

    const firstName = (booking.passenger_name || '').trim().split(' ')[0] || 'Passenger';
    const lastName = (booking.passenger_name || '').trim().split(' ').slice(1).join(' ') || 'N/A';

    const paymentData = {
      merchant_id,
      return_url: config.PAYHERE_RETURN_URL,
      cancel_url: config.PAYHERE_CANCEL_URL,
      notify_url: config.PAYHERE_NOTIFY_URL,
      order_id,
      items: `Bus Ticket - ${booking.origin} to ${booking.destination}`,
      currency,
      amount,
      first_name: firstName,
      last_name: lastName,
      email: booking.passenger_email,
      phone: booking.passenger_phone,
      address: 'Sri Lanka',
      city: booking.origin || 'Colombo',
      country: 'Sri Lanka',
      hash
    };

    res.json({
      success: true,
      message: 'Payment initialized.',
      data: {
        payment: paymentData,
        sandbox: config.PAYHERE_SANDBOX === true || config.PAYHERE_SANDBOX === 'true'
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

    // 1) Verify signature
    const localSig = generateNotifySignature({
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code
    });

    if (localSig !== String(md5sig || '').toUpperCase()) {
      console.error('❌ Invalid payment signature');
      return res.status(400).send('Invalid signature');
    }

    // 2) Find booking
    const booking = await bookingModel.getBookingByReference(order_id);
    if (!booking) {
      console.error('❌ Booking not found:', order_id);
      return res.status(404).send('Booking not found');
    }

    // 3) Idempotency: if already completed, acknowledge
    if (booking.payment_status === 'completed') {
      console.log('ℹ️ Booking already completed:', order_id);
      return res.status(200).send('OK');
    }

    // 4) Save payment record
    await paymentModel.createPayment({
      booking_id: booking.booking_id,
      amount: payhere_amount,
      payment_method: 'PayHere',
      transaction_id: payment_id || `PAYHERE-${Date.now()}`,
      status: status_code === '2' ? 'completed' : 'failed'
    });

    // 5) Update booking
    if (status_code === '2') {
      await finalizeSuccessfulPayment(booking, payment_id || null);
      console.log('✅ Payment completed and booking finalized');
    } else {
      await bookingModel.updateBooking(booking.booking_id, {
        payment_status: 'failed',
        payment_method: 'card_payhere',
        transaction_id: payment_id || null
      });
      console.log('❌ Payment failed');
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Payment notification error:', error);
    return res.status(500).send('Error processing payment');
  }
};

// @desc    Verify payment manually (for testing/admin)
// @route   POST /api/payments/verify/:bookingId
// @access  Private/Admin
const verifyPaymentManually = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await bookingModel.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (booking.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid.'
      });
    }

    await paymentModel.createPayment({
      booking_id: booking.booking_id,
      amount: booking.total_amount,
      payment_method: 'Manual',
      transaction_id: `MANUAL-${Date.now()}`,
      status: 'completed'
    });

    const updatedBooking = await finalizeSuccessfulPayment(booking, null);

    res.json({
      success: true,
      message: 'Payment verified and ticket generated successfully.',
      data: {
        booking: updatedBooking,
        qr_code: updatedBooking.qr_code
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

// @desc    Get payment status by booking reference
// @route   GET /api/payments/status/:bookingRef
// @access  Private
const getPaymentStatusByBookingRef = async (req, res) => {
  try {
    const { bookingRef } = req.params;
    const booking = await bookingModel.getBookingByReference(bookingRef);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (req.user.user_id !== booking.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    return res.json({
      success: true,
      data: {
        booking_reference: booking.booking_reference,
        payment_status: booking.payment_status,
        payment_method: booking.payment_method,
        transaction_id: booking.transaction_id || null,
        booking_id: booking.booking_id
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment status.',
      error: error.message
    });
  }
};

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
  getPaymentStatusByBookingRef,
  getAllPayments
};