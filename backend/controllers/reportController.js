const db = require('../config/database');

// Helper function to normalize date range
const normalizeDateRange = (from, to) => {
  const fromDate = from || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  return {
    fromDate,
    toDate,
    fromDateTime: `${fromDate} 00:00:00`,
    toDateTime: `${toDate} 23:59:59`
  };
};

// @desc    Get overview report
// @route   GET /api/reports/overview
// @access  Private/Admin
const getOverviewReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [[overview]] = await db.query(
      `SELECT
        COUNT(b.booking_id) AS total_bookings,
        SUM(CASE WHEN b.payment_status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
        SUM(CASE WHEN b.payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
        SUM(CASE WHEN b.payment_status = 'failed' THEN 1 ELSE 0 END) AS failed_bookings,
        SUM(CASE WHEN b.payment_status = 'refunded' THEN 1 ELSE 0 END) AS refunded_bookings,
        SUM(CASE WHEN b.payment_status = 'completed' THEN b.total_amount ELSE 0 END) AS total_revenue,
        AVG(CASE WHEN b.payment_status = 'completed' THEN b.total_amount ELSE NULL END) AS avg_booking_value,
        COUNT(DISTINCT s.route_id) AS active_routes,
        COUNT(DISTINCT s.bus_id) AS total_buses
      FROM bookings b
      LEFT JOIN schedules s ON b.schedule_id = s.schedule_id
      WHERE b.booking_date BETWEEN ? AND ?`,
      [fromDateTime, toDateTime]
    );

    // Get occupancy average
    const [[occupancyData]] = await db.query(
      `SELECT
        AVG(occupancy_rate) AS avg_occupancy
      FROM (
        SELECT
          ROUND((COUNT(b.booking_id) / NULLIF(bus.total_seats, 0) * 100), 2) AS occupancy_rate
        FROM schedules s
        JOIN buses bus ON s.bus_id = bus.bus_id
        LEFT JOIN bookings b ON s.schedule_id = b.schedule_id 
          AND b.payment_status IN ('completed', 'pending')
        WHERE s.departure_time BETWEEN ? AND ?
        GROUP BY s.schedule_id
      ) AS occ`
      , [fromDateTime, toDateTime]
    );

    const completionRate =
      Number(overview.total_bookings || 0) > 0
        ? ((Number(overview.completed_bookings || 0) / Number(overview.total_bookings || 0)) * 100).toFixed(2)
        : '0.00';

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        overview: {
          ...overview,
          avg_occupancy: occupancyData?.avg_occupancy || 0,
          completion_rate: Number(completionRate)
        }
      }
    });
  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overview report',
      error: error.message
    });
  }
};

// @desc    Get revenue trend (day/month)
// @route   GET /api/reports/revenue-trend
// @access  Private/Admin
const getRevenueTrendReport = async (req, res) => {
  try {
    const { from, to, group_by = 'day' } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const periodExpr =
      group_by === 'month'
        ? `DATE_FORMAT(booking_date, '%Y-%m')`
        : `DATE(booking_date)`;

    const [rows] = await db.query(
      `SELECT
        ${periodExpr} AS period,
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN payment_status='completed' THEN total_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN payment_status='completed' THEN 1 ELSE 0 END) AS completed_bookings
      FROM bookings
      WHERE booking_date BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period ASC`,
      [fromDateTime, toDateTime]
    );

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        group_by,
        trend: rows
      }
    });
  } catch (error) {
    console.error('Revenue trend report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue trend report',
      error: error.message
    });
  }
};

// @desc    Get payment method split
// @route   GET /api/reports/payment-methods
// @access  Private/Admin
const getPaymentMethodsReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        payment_method,
        COUNT(*) AS bookings,
        SUM(CASE WHEN payment_status='completed' THEN total_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN payment_status='completed' THEN 1 ELSE 0 END) AS completed_count
      FROM bookings
      WHERE booking_date BETWEEN ? AND ?
      GROUP BY payment_method
      ORDER BY bookings DESC`,
      [fromDateTime, toDateTime]
    );

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        methods: rows
      }
    });
  } catch (error) {
    console.error('Payment methods report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods report',
      error: error.message
    });
  }
};

// @desc    Get top routes performance
// @route   GET /api/reports/routes
// @access  Private/Admin
const getRoutesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        r.route_id,
        r.route_name,
        r.origin,
        r.destination,
        COUNT(b.booking_id) AS total_bookings,
        SUM(CASE WHEN b.payment_status='completed' THEN b.total_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN b.payment_status='refunded' THEN 1 ELSE 0 END) AS refunded_count
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE b.booking_date BETWEEN ? AND ?
      GROUP BY r.route_id, r.route_name, r.origin, r.destination
      ORDER BY revenue DESC, total_bookings DESC`,
      [fromDateTime, toDateTime]
    );

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        routes: rows
      }
    });
  } catch (error) {
    console.error('Routes report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching routes report',
      error: error.message
    });
  }
};

// @desc    Get bus occupancy rate by date - FIXED
// @route   GET /api/reports/occupancy
// @access  Private/Admin
const getOccupancyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        s.journey_date AS date,
        COUNT(DISTINCT b.booking_id) AS booked_seats,
        SUM(b_bus.total_seats) AS total_capacity,
        ROUND((COUNT(DISTINCT b.booking_id) / NULLIF(SUM(b_bus.total_seats), 0) * 100), 2) AS occupancy_rate
      FROM schedules s
      JOIN buses b_bus ON s.bus_id = b_bus.bus_id
      LEFT JOIN bookings b ON s.schedule_id = b.schedule_id 
        AND b.payment_status IN ('completed', 'pending')
      WHERE s.journey_date BETWEEN ? AND ?
      GROUP BY s.journey_date
      ORDER BY date ASC`,
      [fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        occupancy: rows
      }
    });
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching occupancy report',
      error: error.message
    });
  }
};

// @desc    Get booking status distribution
// @route   GET /api/reports/booking-status
// @access  Private/Admin
const getBookingStatusReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        payment_status AS status,
        COUNT(*) AS count,
        SUM(total_amount) AS revenue,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?) * 100), 2) AS percentage
      FROM bookings
      WHERE booking_date BETWEEN ? AND ?
      GROUP BY payment_status
      ORDER BY count DESC`,
      [fromDateTime, toDateTime, fromDateTime, toDateTime]
    );

    // Map status names for better display
    const mappedRows = rows.map(row => ({
      status: row.status || 'unknown',
      count: row.count,
      revenue: row.revenue || 0,
      percentage: row.percentage || 0
    }));

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        booking_status: mappedRows
      }
    });
  } catch (error) {
    console.error('Booking status report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking status report',
      error: error.message
    });
  }
};

// @desc    Get peak booking hours
// @route   GET /api/reports/peak-hours
// @access  Private/Admin
const getPeakHoursReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        HOUR(booking_date) AS hour,
        COUNT(*) AS bookings,
        SUM(CASE WHEN payment_status='completed' THEN total_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN payment_status='completed' THEN 1 ELSE 0 END) AS completed_bookings
      FROM bookings
      WHERE booking_date BETWEEN ? AND ?
      GROUP BY HOUR(booking_date)
      ORDER BY hour ASC`,
      [fromDateTime, toDateTime]
    );

    // Fill in missing hours with 0 values (0-23)
    const hourMap = {};
    for (let i = 0; i < 24; i++) {
      hourMap[i] = {
        hour: i,
        bookings: 0,
        revenue: 0,
        completed_bookings: 0
      };
    }

    rows.forEach(row => {
      hourMap[row.hour] = {
        hour: row.hour,
        bookings: row.bookings || 0,
        revenue: row.revenue || 0,
        completed_bookings: row.completed_bookings || 0
      };
    });

    const peakHours = Object.values(hourMap).sort((a, b) => a.hour - b.hour);

    res.json({
      success: true,
      data: {
        range: { from: fromDate, to: toDate },
        peak_hours: peakHours
      }
    });
  } catch (error) {
    console.error('Peak hours report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching peak hours report',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getOverviewReport,
  getRevenueTrendReport,
  getPaymentMethodsReport,
  getRoutesReport,
  getOccupancyReport,
  getBookingStatusReport,
  getPeakHoursReport
};