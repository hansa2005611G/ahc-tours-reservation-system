const bookingModel = require('../models/bookingModel');
const scheduleModel = require('../models/scheduleModel');
const qrService = require('../services/qrService'); 
const emailService = require('../services/emailService'); 
// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
const getAllBookings = async (req, res) => {
  try {
    const { payment_status, verification_status, journey_date, schedule_id } = req.query;
    
    const filters = {};
    
    // If not admin, only show user's own bookings
    if (req.user.role !== 'admin') {
      filters.user_id = req.user.user_id;
    }
    
    if (payment_status) filters.payment_status = payment_status;
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

    // Check if user owns the booking (unless admin)
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

/// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    const {
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone
    } = req.body;

    const user_id = req.user.user_id;

    // Validation
    if (!schedule_id || !seat_number || !passenger_name || !passenger_email || !passenger_phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    // Get schedule details
    const schedule = await scheduleModel.getScheduleById(schedule_id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    // Check if seat is already booked
    const existingBooking = await bookingModel.getBookingBySeat(schedule_id, seat_number);
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This seat is already booked.'
      });
    }

    // Check if seats are available
    if (schedule.available_seats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No seats available for this schedule.'
      });
    }

    // Generate unique booking reference
    const booking_reference = `AHC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create booking with "Pay on Bus" status
    const booking = await bookingModel.createBooking({
      user_id,
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone,
      total_amount: schedule.base_fare,
      payment_status: 'pay_on_bus', // ← Changed from 'pending'
      booking_reference,
      verification_status: 'pending'
    });

    // Generate QR Code immediately
    const qrCode = await qrService.generateQRCode({
      booking_reference: booking_reference,
      passenger_name: passenger_name,
      seat_number: seat_number,
      journey_date: schedule.journey_date,
      origin: schedule.origin,
      destination: schedule.destination
    });

    // Update booking with QR code
    await bookingModel.updateBooking(booking.booking_id, {
      qr_code: qrCode.qr_code_base64
    });

    // Decrease available seats
    await scheduleModel.updateAvailableSeats(schedule_id, 1);

    // Get complete booking details
    const completeBooking = await bookingModel.getBookingById(booking.booking_id);

    // Send booking confirmation email
    try {
      await emailService.sendBookingConfirmation({
        passenger_email: completeBooking.passenger_email,
        passenger_name: completeBooking.passenger_name,
        booking_reference: completeBooking.booking_reference,
        journey_date: completeBooking.journey_date,
        departure_time: completeBooking.departure_time,
        arrival_time: completeBooking.arrival_time,
        origin: completeBooking.origin,
        destination: completeBooking.destination,
        seat_number: completeBooking.seat_number,
        bus_number: completeBooking.bus_number,
        bus_type: completeBooking.bus_type,
        total_amount: completeBooking.total_amount,
        qr_code_base64: qrCode.qr_code_base64
      });
      console.log('✅ Booking confirmation email sent');
    } catch (emailError) {
      console.log('⚠️ Email not sent:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Pay on the bus.',
      data: { 
        booking: completeBooking,
        qr_code: qrCode.qr_code_base64
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

    // Get booking
    const booking = await bookingModel.getBookingById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if user owns the booking (unless admin)
    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own bookings.'
      });
    }

    // Check if booking can be cancelled
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

    // Cancel booking
    const cancelled = await bookingModel.cancelBooking(id);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Failed to cancel booking.'
      });
    }

    // Increase available seats back
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
    const stats = await bookingModel.getBookingStatistics();

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
  getBookingStatistics
};