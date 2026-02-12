const bookingModel = require('../models/bookingModel');
const scheduleModel = require('../models/scheduleModel');

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

// @desc    Create new booking
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

    // Validation
    if (!schedule_id || !seat_number || !passenger_name || !passenger_email || !passenger_phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: schedule_id, seat_number, passenger details.'
      });
    }

    // Check if schedule exists
    const schedule = await scheduleModel.getScheduleById(schedule_id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    // Check if schedule is active
    if (schedule.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'This schedule is not available for booking.'
      });
    }

    // Check if seat number is valid
    if (seat_number < 1 || seat_number > schedule.total_seats) {
      return res.status(400).json({
        success: false,
        message: `Invalid seat number. Must be between 1 and ${schedule.total_seats}.`
      });
    }

    // Check if seat is available
    const seatAvailable = await bookingModel.isSeatAvailable(schedule_id, seat_number);
    if (!seatAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Seat is already booked. Please select another seat.'
      });
    }

    // Check if there are available seats
    if (schedule.available_seats < 1) {
      return res.status(400).json({
        success: false,
        message: 'No seats available on this schedule.'
      });
    }

    // Create booking
    const newBooking = await bookingModel.createBooking({
      user_id: req.user.user_id,
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone,
      journey_date: schedule.journey_date,
      total_amount: schedule.base_fare
    });

    // Reduce available seats
    await scheduleModel.updateAvailableSeats(schedule_id, 1);

    // Get created booking with full details
    const booking = await bookingModel.getBookingById(newBooking.booking_id);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Please proceed to payment.',
      data: { booking }
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