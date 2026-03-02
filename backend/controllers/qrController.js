const bookingModel = require('../models/bookingModel');
const scheduleModel = require('../models/scheduleModel');

// @desc    Verify QR code and get booking details
// @route   POST /api/qr/verify
// @access  Private (Conductor)
const verifyQRCode = async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required'
      });
    }

    // Parse QR data
    let qrInfo;
    try {
      qrInfo = JSON.parse(qr_data);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    const { ref } = qrInfo;

    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference not found in QR code'
      });
    }

    // Get booking by reference
    const [bookings] = await bookingModel.db.query(
      `SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name, bus.bus_type
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      WHERE b.booking_reference = ?`,
      [ref]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check if already used
    if (booking.verification_status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used',
        data: { booking }
      });
    }

    // Check if cancelled
    if (booking.payment_status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Ticket has been cancelled',
        data: { booking }
      });
    }

    // Check if journey date is today
    const journeyDate = new Date(booking.journey_date);
    const today = new Date();
    journeyDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (journeyDate.getTime() !== today.getTime()) {
      return res.status(400).json({
        success: false,
        message: `This ticket is for ${journeyDate.toLocaleDateString()}`,
        data: { booking }
      });
    }

    res.json({
      success: true,
      message: 'Valid ticket',
      data: { booking }
    });

  } catch (error) {
    console.error('QR verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying QR code',
      error: error.message
    });
  }
};

// @desc    Mark ticket as used
// @route   POST /api/qr/mark-used
// @access  Private (Conductor)
const markTicketAsUsed = async (req, res) => {
  try {
    const { booking_id, payment_received } = req.body;
    const conductor_id = req.user.user_id;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Update booking verification status
    await bookingModel.updateBooking(booking_id, {
      verification_status: 'used',
      verified_by: conductor_id,
      verified_at: new Date()
    });

    // If payment received on bus, update payment status
    if (payment_received) {
      await bookingModel.updateBooking(booking_id, {
        payment_status: 'completed'
      });
    }

    res.json({
      success: true,
      message: 'Ticket marked as used successfully'
    });

  } catch (error) {
    console.error('Mark ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking ticket as used',
      error: error.message
    });
  }
};

// @desc    Get today's schedules for conductor
// @route   GET /api/qr/today-schedules
// @access  Private (Conductor)
const getTodaySchedules = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [schedules] = await scheduleModel.db.query(
      `SELECT 
        s.*,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats,
        r.route_name, r.origin, r.destination, r.base_fare,
        (SELECT COUNT(*) FROM bookings WHERE schedule_id = s.schedule_id AND verification_status = 'used') as used_seats,
        (SELECT COUNT(*) FROM bookings WHERE schedule_id = s.schedule_id AND payment_status != 'refunded') as total_bookings
      FROM schedules s
      JOIN buses b ON s.bus_id = b.bus_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE s.journey_date = ?
        AND s.is_cancelled = FALSE
      ORDER BY s.departure_time`,
      [today]
    );

    res.json({
      success: true,
      count: schedules.length,
      data: { schedules }
    });

  } catch (error) {
    console.error('Get today schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedules',
      error: error.message
    });
  }
};

// @desc    Get bookings for a schedule
// @route   GET /api/qr/schedule/:schedule_id/bookings
// @access  Private (Conductor)
const getScheduleBookings = async (req, res) => {
  try {
    const { schedule_id } = req.params;

    const [bookings] = await bookingModel.db.query(
      `SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE b.schedule_id = ?
        AND b.payment_status != 'refunded'
      ORDER BY b.seat_number`,
      [schedule_id]
    );

    res.json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });

  } catch (error) {
    console.error('Get schedule bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

module.exports = {
  verifyQRCode,
  markTicketAsUsed,
  getTodaySchedules,
  getScheduleBookings
};