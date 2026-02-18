const cancellationModel = require('../models/cancellationModel');
const bookingModel = require('../models/bookingModel');
const scheduleModel = require('../models/scheduleModel');
const emailService = require('../services/emailService');

// @desc    Request booking cancellation (Passenger)
// @route   POST /api/cancellations
// @access  Private
const requestCancellation = async (req, res) => {
  try {
    const { booking_id, reason } = req.body;
    const user_id = req.user.user_id;

    console.log('📥 Cancellation Request Received:');
    console.log('- Booking ID:', booking_id);
    console.log('- User ID:', user_id);
    console.log('- Reason:', reason);

    // Validation
    if (!booking_id || !reason) {
      console.log('❌ Validation failed: Missing booking_id or reason');
      return res.status(400).json({
        success: false,
        message: 'Booking ID and reason are required.'
      });
    }

    // Get booking details
    console.log('🔍 Fetching booking...');
    const booking = await bookingModel.getBookingById(booking_id);
    
    if (!booking) {
      console.log('❌ Booking not found');
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    console.log('✅ Booking found:', booking.booking_reference);

    // Check if user owns the booking
    if (booking.user_id !== user_id) {
      console.log('❌ User does not own booking');
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings.'
      });
    }

    // Check if already cancelled or refunded
    if (booking.payment_status === 'refunded') {
      console.log('❌ Booking already cancelled');
      return res.status(400).json({
        success: false,
        message: 'This booking is already cancelled.'
      });
    }

    // Check if payment is completed
    if (booking.payment_status !== 'completed') {
      console.log('❌ Payment not completed');
      return res.status(400).json({
        success: false,
        message: 'Only paid bookings can be cancelled.'
      });
    }

    // Check if ticket is already used
    if (booking.verification_status === 'used') {
      console.log('❌ Ticket already used');
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel. Ticket has already been used.'
      });
    }

    // Check if there's already a pending cancellation request
    const existingRequest = await cancellationModel.getCancellationByBookingId(booking_id);
    if (existingRequest && existingRequest.status === 'pending') {
      console.log('❌ Pending cancellation already exists');
      return res.status(400).json({
        success: false,
        message: 'A cancellation request is already pending for this booking.'
      });
    }

    // Check time restriction: Must be at least 5 hours before departure
    const journeyDateTime = new Date(`${booking.journey_date}T${booking.departure_time}`);
    const now = new Date();
    const hoursDifference = (journeyDateTime - now) / (1000 * 60 * 60);

    console.log('⏰ Time check:');
    console.log('- Journey DateTime:', journeyDateTime);
    console.log('- Current DateTime:', now);
    console.log('- Hours Difference:', hoursDifference);

    if (hoursDifference < 5) {
      console.log('❌ Less than 5 hours before departure');
      return res.status(400).json({
        success: false,
        message: 'Cancellation must be requested at least 5 hours before departure time.'
      });
    }

    // Create cancellation request
    console.log('💾 Creating cancellation request...');
    const cancellationRequest = await cancellationModel.createCancellationRequest({
      booking_id,
      user_id,
      reason
    });

    console.log('✅ Cancellation request created:', cancellationRequest);

    // Send email to admin
    try {
      await emailService.sendAdminCancellationAlert({
        booking_reference: booking.booking_reference,
        passenger_name: booking.passenger_name,
        passenger_email: booking.passenger_email,
        reason,
        journey_date: booking.journey_date,
        origin: booking.origin,
        destination: booking.destination
      });
      console.log('✅ Admin cancellation alert sent');
    } catch (emailError) {
      console.log('⚠️ Admin alert not sent:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Cancellation request submitted successfully. Waiting for admin approval.',
      data: { cancellation_request: cancellationRequest }
    });
  } catch (error) {
    console.error('❌ Request cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting cancellation request.',
      error: error.message
    });
  }
};

// @desc    Get all cancellation requests (Admin)
// @route   GET /api/cancellations
// @access  Private/Admin
const getAllCancellationRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    const filters = {};
    if (status) filters.status = status;

    const requests = await cancellationModel.getAllCancellationRequests(filters);

    res.json({
      success: true,
      count: requests.length,
      data: { cancellation_requests: requests }
    });
  } catch (error) {
    console.error('Get cancellation requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cancellation requests.',
      error: error.message
    });
  }
};

// @desc    Get cancellation request by ID (Admin)
// @route   GET /api/cancellations/:id
// @access  Private/Admin
const getCancellationRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await cancellationModel.getCancellationRequestById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cancellation request not found.'
      });
    }

    res.json({
      success: true,
      data: { cancellation_request: request }
    });
  } catch (error) {
    console.error('Get cancellation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cancellation request.',
      error: error.message
    });
  }
};

// @desc    Approve/Reject cancellation request (Admin)
// @route   PUT /api/cancellations/:id
// @access  Private/Admin
const processCancellationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_remarks } = req.body;
    const admin_id = req.user.user_id;

    // Validation
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected".'
      });
    }

    // Get cancellation request
    const request = await cancellationModel.getCancellationRequestById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cancellation request not found.'
      });
    }

    // Check if already processed
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This cancellation request has already been processed.'
      });
    }

    let refund_amount = 0;

    if (status === 'approved') {
      // Calculate refund amount
      const journeyDateTime = new Date(`${request.journey_date}T${request.departure_time}`);
      const now = new Date();
      const hoursDifference = (journeyDateTime - now) / (1000 * 60 * 60);

      // Refund policy
      if (hoursDifference >= 24) {
        refund_amount = request.total_amount;
      } else if (hoursDifference >= 12) {
        refund_amount = request.total_amount * 0.75;
      } else if (hoursDifference >= 5) {
        refund_amount = request.total_amount * 0.5;
      } else {
        refund_amount = 0;
      }

      // Update booking status to refunded
      await bookingModel.updateBooking(request.booking_id, {
        payment_status: 'refunded'
      });

      // Increase available seats
      const booking = await bookingModel.getBookingById(request.booking_id);
      await scheduleModel.updateAvailableSeats(booking.schedule_id, -1);
    }

    // Update cancellation request
    await cancellationModel.updateCancellationRequest(id, {
      status,
      admin_remarks,
      processed_by: admin_id,
      refund_amount
    });

    // Send notification to passenger
    try {
      await emailService.sendCancellationNotification({
        passenger_email: request.passenger_email,
        passenger_name: request.passenger_name,
        booking_reference: request.booking_reference,
        status,
        admin_remarks,
        refund_amount
      });
      console.log('✅ Cancellation notification sent to passenger');
    } catch (emailError) {
      console.log('⚠️ Passenger notification not sent:', emailError.message);
    }

    const message = status === 'approved' 
      ? `Cancellation approved. Refund amount: LKR ${refund_amount.toFixed(2)}`
      : 'Cancellation request rejected.';

    res.json({
      success: true,
      message,
      data: { 
        status,
        refund_amount: status === 'approved' ? refund_amount : 0
      }
    });
  } catch (error) {
    console.error('Process cancellation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing cancellation request.',
      error: error.message
    });
  }
};

// @desc    Get cancellation statistics (Admin)
// @route   GET /api/cancellations/stats/overview
// @access  Private/Admin
const getCancellationStats = async (req, res) => {
  try {
    const stats = await cancellationModel.getCancellationStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get cancellation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cancellation statistics.',
      error: error.message
    });
  }
};

// @desc    Get my cancellation requests (Passenger)
// @route   GET /api/cancellations/my-requests
// @access  Private
const getMyCancellationRequests = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get all bookings by user
    const userBookings = await bookingModel.getAllBookings({ user_id });
    const bookingIds = userBookings.map(b => b.booking_id);

    if (bookingIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: { cancellation_requests: [] }
      });
    }

    // Get cancellation requests for user's bookings
    const allRequests = await cancellationModel.getAllCancellationRequests();
    const userRequests = allRequests.filter(req => bookingIds.includes(req.booking_id));

    res.json({
      success: true,
      count: userRequests.length,
      data: { cancellation_requests: userRequests }
    });
  } catch (error) {
    console.error('Get my cancellation requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your cancellation requests.',
      error: error.message
    });
  }
};

module.exports = {
  requestCancellation,
  getAllCancellationRequests,
  getCancellationRequestById,
  processCancellationRequest,
  getCancellationStats,
  getMyCancellationRequests
};