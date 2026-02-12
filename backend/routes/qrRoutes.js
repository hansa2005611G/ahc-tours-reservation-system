const express = require('express');
const router = express.Router();
const bookingModel = require('../models/bookingModel');
const { verifyToken } = require('../middleware/authMiddleware');
const { isConductor } = require('../middleware/roleMiddleware');

// @desc    Verify QR code and mark ticket as used
// @route   POST /api/qr/verify
// @access  Private/Conductor
router.post('/verify', verifyToken, isConductor, async (req, res) => {
  try {
    const { booking_reference } = req.body;

    if (!booking_reference) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required.'
      });
    }

    // Get booking
    const booking = await bookingModel.getBookingByReference(booking_reference);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
        verification_status: 'invalid'
      });
    }

    // Check payment status
    if (booking.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed for this booking.',
        verification_status: 'invalid'
      });
    }

    // Check if already used
    if (booking.verification_status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used.',
        verification_status: 'duplicate',
        data: { booking }
      });
    }

    // Check if journey date is valid
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const journeyDate = new Date(booking.journey_date);
    
    if (journeyDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Ticket has expired.',
        verification_status: 'expired',
        data: { booking }
      });
    }

    // Mark as verified/used
    await bookingModel.updateBooking(booking.booking_id, {
      verification_status: 'used'
    });

    // Log verification
    const db = require('../config/database');
    await db.query(
      'INSERT INTO qr_verification_logs (booking_id, conductor_id, verification_status) VALUES (?, ?, ?)',
      [booking.booking_id, req.user.user_id, 'valid']
    );

    res.json({
      success: true,
      message: 'Ticket verified successfully!',
      verification_status: 'valid',
      data: { booking }
    });
  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying ticket.',
      error: error.message
    });
  }
});

module.exports = router;