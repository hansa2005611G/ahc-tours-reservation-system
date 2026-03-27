const bookingModel = require('../models/bookingModel');
const scheduleModel = require('../models/scheduleModel');
const qrService = require('../services/qrService');
const emailService = require('../services/emailService');
const db = require('../config/database');


// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
const getAllBookings = async (req, res) => {
  try {
    const { payment_status, payment_method, verification_status, journey_date, schedule_id } = req.query;

    const filters = {};

    // If not admin, only show user's own bookings
    if (req.user.role !== 'admin') {
      filters.user_id = req.user.user_id;
    }

    if (payment_status) filters.payment_status = payment_status;
    if (payment_method) filters.payment_method = payment_method;
    if (verification_status) filters.verification_status = verification_status;
    if (journey_date) filters.journey_date = journey_date;
    if (schedule_id) filters.schedule_id = schedule_id;

    const bookings = await bookingModel.getAllBookings(filters);

    res.json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings.',
      error: error.message
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own bookings.'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking.',
      error: error.message
    });
  }
};

// @desc    Get booking by reference
// @route   GET /api/bookings/reference/:ref
// @access  Public
const getBookingByReference = async (req, res) => {
  try {
    const { ref } = req.params;
    const booking = await bookingModel.getBookingByReference(ref);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking by reference error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking.',
      error: error.message
    });
  }
};

// @desc    Get booking statistics overview
// @route   GET /api/bookings/stats/overview
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_bookings,
        SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
      FROM bookings
    `);

    res.json({
      success: true,
      data: {
        stats: stats || {
          total_bookings: 0,
          completed_bookings: 0,
          pending_bookings: 0,
          failed_bookings: 0,
          refunded_bookings: 0,
          total_revenue: 0
        }
      }
    });
  } catch (error) {
    console.error('Booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics',
      error: error.message
    });
  }
};


// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    const {
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone,
      payment_method // NEW: pay_on_bus | card_payhere
    } = req.body;

    const user_id = req.user.user_id;

    if (!schedule_id || !seat_number || !passenger_name || !passenger_email || !passenger_phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    const finalPaymentMethod =
      payment_method === 'card_payhere' ? 'card_payhere' : 'pay_on_bus';

    const schedule = await scheduleModel.getScheduleById(schedule_id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    const existingBooking = await bookingModel.getBookingBySeat(schedule_id, seat_number);
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This seat is already booked.'
      });
    }

    if (schedule.available_seats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No seats available for this schedule.'
      });
    }

    const booking_reference = `AHC-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // IMPORTANT:
    // payment_status must stay in enum: pending/completed/failed/refunded
    // pay_on_bus/card type goes to payment_method column
    const booking = await bookingModel.createBooking({
      user_id,
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone,
      journey_date: schedule.journey_date || null,
      total_amount: schedule.base_fare,
      payment_method: finalPaymentMethod,
      payment_status: 'pending',
      booking_reference,
      verification_status: 'pending'
    });

    // For pay_on_bus: generate QR immediately
    // For card_payhere: QR will be generated after payment success in paymentController
    let qrBase64 = null;
    if (finalPaymentMethod === 'pay_on_bus') {
      const qrCode = await qrService.generateQRCode({
        booking_reference,
        passenger_name,
        seat_number,
        journey_date: schedule.journey_date,
        origin: schedule.origin,
        destination: schedule.destination
      });

      qrBase64 = qrCode.qr_code_base64;

      await bookingModel.updateBooking(booking.booking_id, {
        qr_code: qrBase64
      });
    }

    // reserve seat immediately (both methods)
    await scheduleModel.updateAvailableSeats(schedule_id, 1);

    const completeBooking = await bookingModel.getBookingById(booking.booking_id);

    // Send email immediately only for pay_on_bus.
    // For card_payhere, email is sent after payment notify success.
    if (finalPaymentMethod === 'pay_on_bus') {
      try {
        await emailService.sendBookingConfirmation({
          passenger_email: completeBooking.passenger_email,
          passenger_name: completeBooking.passenger_name,
          booking_reference: completeBooking.booking_reference,
          journey_date: completeBooking.journey_date || completeBooking.schedule_journey_date,
          departure_time: completeBooking.departure_time,
          arrival_time: completeBooking.arrival_time,
          origin: completeBooking.origin,
          destination: completeBooking.destination,
          seat_number: completeBooking.seat_number,
          bus_number: completeBooking.bus_number,
          bus_type: completeBooking.bus_type,
          total_amount: completeBooking.total_amount,
          qr_code_base64: qrBase64
        });
        console.log('✅ Booking confirmation email sent');
      } catch (emailError) {
        console.log('⚠️ Email not sent:', emailError.message);
      }
    }

    res.status(201).json({
      success: true,
      message:
        finalPaymentMethod === 'card_payhere'
          ? 'Booking created. Proceed to card payment.'
          : 'Booking created successfully. Pay on the bus.',
      data: {
        booking: completeBooking,
        qr_code: qrBase64
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking.',
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await bookingModel.getBookingById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own bookings.'
      });
    }

    if (booking.payment_status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled.'
      });
    }

    if (booking.verification_status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking. Ticket has already been used.'
      });
    }

    // If your model doesn't have cancelBooking, use updateBooking fallback
    let cancelled = false;
    if (typeof bookingModel.cancelBooking === 'function') {
      cancelled = await bookingModel.cancelBooking(id);
    } else {
      cancelled = await bookingModel.updateBooking(id, { payment_status: 'refunded' });
    }

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Failed to cancel booking.'
      });
    }

    await scheduleModel.updateAvailableSeats(booking.schedule_id, -1);

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Refund will be processed.'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking.',
      error: error.message
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats/overview
// @access  Private/Admin
const getBookingStatistics = async (req, res) => {
  try {
    const stats = await bookingModel.getBookingStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get booking statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics.',
      error: error.message
    });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  getBookingByReference,
  createBooking,
  cancelBooking,
  getBookingStatistics,
  getStats
};