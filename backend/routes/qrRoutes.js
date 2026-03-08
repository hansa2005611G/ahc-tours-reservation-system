const express = require('express');
const router = express.Router();
const bookingModel = require('../models/bookingModel');
const { verifyToken } = require('../middleware/authMiddleware');
const { isConductor } = require('../middleware/roleMiddleware');

// @desc    Verify QR code and get booking details
// @route   POST /api/qr/verify
// @access  Private/Conductor
router.post('/verify', verifyToken, isConductor, async (req, res) => {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🔍 QR VERIFICATION REQUEST');
    console.log('═══════════════════════════════════════');
    console.log('Request body:', req.body);
    console.log('Conductor:', req.user);
    
    const { booking_reference } = req.body;

    if (!booking_reference) {
      console.log('❌ No booking reference provided');
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required.'
      });
    }

    console.log('🔍 Looking for booking:', booking_reference);

    // Get booking
    const booking = await bookingModel.getBookingByReference(booking_reference);
    
    console.log('Booking found:', booking ? 'YES' : 'NO');
    if (booking) {
      console.log('Booking details:', {
        booking_id: booking.booking_id,
        passenger_name: booking.passenger_name,
        payment_status: booking.payment_status,
        verification_status: booking.verification_status,
        journey_date: booking.journey_date
      });
    }

    if (!booking) {
      console.log('❌ Booking not found');
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
        verification_status: 'invalid'
      });
    }

    // Check if already used
    if (booking.verification_status === 'used') {
      console.log('⚠️ Ticket already used');
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
    
    console.log('Date check:', {
      today: today.toISOString(),
      journeyDate: journeyDate.toISOString(),
      isExpired: journeyDate < today
    });
    
    if (journeyDate < today) {
      console.log('⚠️ Ticket expired');
      return res.status(400).json({
        success: false,
        message: 'Ticket has expired.',
        verification_status: 'expired',
        data: { booking }
      });
    }

    // Check payment status - FIXED TO ACCEPT PAY_ON_BUS
    console.log('Payment status check:', booking.payment_status);
    
    // Accept: completed, pay_on_bus
    // Reject: pending, failed, refunded, cancelled
    const validPaymentStatuses = ['completed', 'pay_on_bus'];
    
    if (!validPaymentStatuses.includes(booking.payment_status)) {
      console.log('⚠️ Payment status invalid:', booking.payment_status);
      return res.status(400).json({
        success: false,
        message: `Payment status is ${booking.payment_status}. Cannot verify ticket.`,
        verification_status: 'invalid',
        data: { booking }
      });
    }

    console.log('✅ All checks passed - Ticket is valid!');
    
    // Check if this is a "pay on bus" booking
    const requiresPayment = booking.payment_status === 'pay_on_bus';
    
    if (requiresPayment) {
      console.log('💰 Payment required on bus');
    }
    
    console.log('═══════════════════════════════════════');

    // Return booking details
    res.json({
      success: true,
      message: requiresPayment 
        ? 'Ticket verified! Payment required on bus.' 
        : 'Ticket verified successfully!',
      verification_status: 'valid',
      requires_payment: requiresPayment,
      data: { booking }
    });
  } catch (error) {
    console.error('❌ QR verification error:', error);
    console.log('═══════════════════════════════���═══════');
    res.status(500).json({
      success: false,
      message: 'Error verifying ticket.',
      error: error.message
    });
  }
});

// @desc    Mark ticket as used
// @route   POST /api/qr/mark-used
// @access  Private/Conductor
router.post('/mark-used', verifyToken, isConductor, async (req, res) => {
  try {
    console.log('═══════════════════════════════════════');
    console.log('📝 MARK TICKET AS USED');
    console.log('═══════════════════════════════════════');
    console.log('Request body:', req.body);
    
    const { booking_id, payment_received } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

    // Get booking
    const booking = await bookingModel.getBookingById(booking_id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    console.log('Booking before update:', {
      booking_id: booking.booking_id,
      verification_status: booking.verification_status,
      payment_status: booking.payment_status
    });

    // Mark as used
    await bookingModel.updateBooking(booking.booking_id, {
      verification_status: 'used'
    });

    // If payment was received on bus, update payment status
    if (payment_received && booking.payment_status === 'pay_on_bus') {
      await bookingModel.updateBooking(booking.booking_id, {
        payment_status: 'completed'
      });
      console.log('✅ Payment status updated to completed');
    }

    // Log verification
    const db = require('../config/database');
    await db.query(
      'INSERT INTO qr_verification_logs (booking_id, conductor_id, verification_status, created_at) VALUES (?, ?, ?, NOW())',
      [booking.booking_id, req.user.user_id, 'valid']
    );

    console.log('✅ Ticket marked as used');
    console.log('═══════════════════════════════════════');

    res.json({
      success: true,
      message: 'Ticket marked as used successfully!',
      data: { booking }
    });
  } catch (error) {
    console.error('❌ Mark used error:', error);
    console.log('═══════════════════════════════════════');
    res.status(500).json({
      success: false,
      message: 'Error marking ticket as used.',
      error: error.message
    });
  }
});

// @desc    Get today's schedules
// @route   GET /api/qr/today-schedules
// @access  Private/Conductor
router.get('/today-schedules', verifyToken, isConductor, async (req, res) => {
  try {
    const db = require('../config/database');
    
    const [schedules] = await db.query(
      `SELECT 
        s.schedule_id,
        s.journey_date,
        s.departure_time,
        s.arrival_time,
        s.available_seats,
        r.route_name,
        r.origin,
        r.destination,
        r.base_fare,
        b.bus_number,
        b.bus_name,
        b.bus_type,
        b.total_seats,
        COUNT(bk.booking_id) as total_bookings,
        SUM(CASE WHEN bk.verification_status = 'used' THEN 1 ELSE 0 END) as verified_bookings,
        SUM(CASE WHEN bk.payment_status = 'pay_on_bus' THEN 1 ELSE 0 END) as pay_on_bus_count
      FROM schedules s
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses b ON s.bus_id = b.bus_id
      LEFT JOIN bookings bk ON s.schedule_id = bk.schedule_id
      WHERE s.journey_date = CURDATE()
      GROUP BY s.schedule_id
      ORDER BY s.departure_time ASC`
    );

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedules.',
      error: error.message
    });
  }
});



// @desc    Get bookings for a schedule
// @route   GET /api/qr/schedule/:schedule_id/bookings
// @access  Private/Conductor
router.get('/schedule/:schedule_id/bookings', verifyToken, isConductor, async (req, res) => {
  try {
    const { schedule_id } = req.params;
    
    const bookings = await bookingModel.getAllBookings({ schedule_id });

    res.json({
      success: true,
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
});

router.get('/statistics', verifyToken, isConductor, async (req, res) => {
  try {
    const conductorId = req.user.user_id;
    const today = new Date().toISOString().split('T')[0];
    
    const db = require('../config/database');
    
    // Get statistics from verification logs
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_scanned,
        COUNT(DISTINCT b.booking_id) as unique_bookings,
        SUM(CASE WHEN b.payment_status = 'completed' THEN 1 ELSE 0 END) as prepaid_count,
        SUM(CASE WHEN b.payment_status = 'pay_on_bus' THEN 1 ELSE 0 END) as pay_on_bus_count,
        SUM(CASE WHEN b.payment_status = 'pay_on_bus' THEN b.total_amount ELSE 0 END) as cash_collected
      FROM qr_verification_logs vl
      JOIN bookings b ON vl.booking_id = b.booking_id
      WHERE vl.conductor_id = ?
      AND DATE(vl.created_at) = ?
    `, [conductorId, today]);
    
    res.json({
      success: true,
      data: {
        statistics: stats[0]
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics.',
      error: error.message
    });
  }
});

// @desc    Search bookings
// @route   GET /api/qr/search?q=query&type=all
// @access  Private/Conductor
router.get('/search', verifyToken, isConductor, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    console.log('═══════════════════════════════════════');
    console.log('🔍 SEARCH REQUEST');
    console.log('Query:', q);
    console.log('Type:', type);
    console.log('═══════════════════════════════════════');

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = `%${q}%`;
    const db = require('../config/database');
    
    let query = `
      SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name, bus.bus_type
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      WHERE s.journey_date >= CURDATE()
    `;
    
    const params = [];

    // Search by type
    if (type === 'reference') {
      query += ' AND b.booking_reference LIKE ?';
      params.push(searchQuery);
    } else if (type === 'name') {
      query += ' AND b.passenger_name LIKE ?';
      params.push(searchQuery);
    } else if (type === 'seat') {
      query += ' AND b.seat_number LIKE ?';
      params.push(searchQuery);
    } else if (type === 'phone') {
      query += ' AND b.passenger_phone LIKE ?';
      params.push(searchQuery);
    } else {
      // Search all fields
      query += ` AND (
        b.booking_reference LIKE ? OR
        b.passenger_name LIKE ? OR
        b.seat_number LIKE ? OR
        b.passenger_phone LIKE ?
      )`;
      params.push(searchQuery, searchQuery, searchQuery, searchQuery);
    }

    query += ' ORDER BY s.journey_date ASC, s.departure_time ASC LIMIT 50';

    const [results] = await db.query(query, params);

    console.log(`✅ Found ${results.length} results`);
    console.log('═══════════════════════════════════════');

    res.json({
      success: true,
      data: {
        bookings: results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching bookings',
      error: error.message
    });
  }
});

// @desc    Get schedule details with all bookings
// @route   GET /api/qr/schedule/:schedule_id/details
// @access  Private/Conductor
router.get('/schedule/:schedule_id/details', verifyToken, isConductor, async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const db = require('../config/database');

    console.log('═══════════════════════════════════════');
    console.log('📋 SCHEDULE DETAILS REQUEST');
    console.log('Schedule ID:', schedule_id);
    console.log('═══════════════════════════════════════');

    // Get schedule details
    const [scheduleRows] = await db.query(`
      SELECT 
        s.*,
        r.route_name, r.origin, r.destination, r.base_fare,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats
      FROM schedules s
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses b ON s.bus_id = b.bus_id
      WHERE s.schedule_id = ?
    `, [schedule_id]);

    if (scheduleRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const schedule = scheduleRows[0];

    // Get all bookings for this schedule
    const bookings = await bookingModel.getAllBookings({ schedule_id });

    // Calculate statistics
    const stats = {
      total_bookings: bookings.length,
      total_seats: schedule.total_seats,
      available_seats: schedule.available_seats,
      occupied_seats: schedule.total_seats - schedule.available_seats,
      
      // Payment status breakdown
      paid_count: bookings.filter(b => b.payment_status === 'completed').length,
      pay_on_bus_count: bookings.filter(b => b.payment_status === 'pay_on_bus').length,
      pending_count: bookings.filter(b => b.payment_status === 'pending').length,
      
      // Verification status breakdown
      used_count: bookings.filter(b => b.verification_status === 'used').length,
      pending_verification_count: bookings.filter(b => b.verification_status === 'pending').length,
      
      // Revenue
      total_revenue: bookings
        .filter(b => b.payment_status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.total_amount), 0),
      pending_revenue: bookings
        .filter(b => b.payment_status === 'pay_on_bus')
        .reduce((sum, b) => sum + parseFloat(b.total_amount), 0),
    };

    console.log('✅ Schedule found with', bookings.length, 'bookings');
    console.log('═══════════════════════════════════════');

    res.json({
      success: true,
      data: {
        schedule,
        bookings,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get schedule details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule details',
      error: error.message
    });
  }
});

// @desc    Get filtered bookings
// @route   GET /api/qr/bookings/filter
// @access  Private/Conductor
router.get('/bookings/filter', verifyToken, isConductor, async (req, res) => {
  try {
    const { 
      payment_status, 
      verification_status, 
      date_from, 
      date_to,
      schedule_id 
    } = req.query;

    console.log('═══════════════════════════════════════');
    console.log('🎛️ FILTER BOOKINGS REQUEST');
    console.log('Filters:', { payment_status, verification_status, date_from, date_to, schedule_id });
    console.log('═══════════════════════════════════════');

    const db = require('../config/database');
    
    let query = `
      SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name, bus.bus_type
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      WHERE 1=1
    `;
    
    const params = [];

    // Apply filters
    if (payment_status) {
      query += ' AND b.payment_status = ?';
      params.push(payment_status);
    }

    if (verification_status) {
      query += ' AND b.verification_status = ?';
      params.push(verification_status);
    }

    if (date_from) {
      query += ' AND s.journey_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND s.journey_date <= ?';
      params.push(date_to);
    }

    if (schedule_id) {
      query += ' AND b.schedule_id = ?';
      params.push(schedule_id);
    }

    query += ' ORDER BY s.journey_date DESC, s.departure_time DESC';

    const [results] = await db.query(query, params);

    console.log(`✅ Found ${results.length} bookings matching filters`);
    console.log('═══════════════════════════════════════');

    res.json({
      success: true,
      data: {
        bookings: results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('Filter bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering bookings',
      error: error.message
    });
  }
});


module.exports = router;