const db = require('../config/database');

const toDateTimeStart = (d) => `${d} 00:00:00`;
const toDateTimeEnd = (d) => `${d} 23:59:59`;

const normalizeDateRange = (from, to) => {
  const today = new Date().toISOString().split('T')[0];
  const finalTo = to || today;

  let finalFrom = from;
  if (!finalFrom) {
    const d = new Date(finalTo);
    d.setDate(d.getDate() - 29); // last 30 days
    finalFrom = d.toISOString().split('T')[0];
  }

  return {
    fromDate: finalFrom,
    toDate: finalTo,
    fromDateTime: toDateTimeStart(finalFrom),
    toDateTime: toDateTimeEnd(finalTo)
  };
};

// @desc    Get reports overview
// @route   GET /api/reports/overview
// @access  Private/Admin
const getOverviewReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, fromDateTime, toDateTime } = normalizeDateRange(from, to);

    const [[overview]] = await db.query(
      `SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) AS failed_bookings,
        SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) AS refunded_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN total_amount ELSE 0 END) AS total_revenue,
        AVG(CASE WHEN payment_status = 'completed' THEN total_amount ELSE NULL END) AS avg_ticket_value
      FROM bookings
      WHERE booking_date BETWEEN ? AND ?`,
      [fromDateTime, toDateTime]
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

// @desc    Get schedule occupancy report
// @route   GET /api/reports/occupancy
// @access  Private/Admin
const getOccupancyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate } = normalizeDateRange(from, to);

    const [rows] = await db.query(
      `SELECT
        s.schedule_id,
        s.journey_date,
        s.departure_time,
        b.bus_number,
        b.total_seats,
        r.route_name,
        r.origin,
        r.destination,
        COUNT(bk.booking_id) AS booked_seats,
        SUM(CASE WHEN bk.verification_status='used' THEN 1 ELSE 0 END) AS used_seats,
        ROUND((COUNT(bk.booking_id) / NULLIF(b.total_seats,0)) * 100, 2) AS occupancy_percent
      FROM schedules s
      JOIN buses b ON s.bus_id = b.bus_id
      JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN bookings bk
        ON bk.schedule_id = s.schedule_id
        AND bk.payment_status != 'refunded'
      WHERE s.journey_date BETWEEN ? AND ?
      GROUP BY
        s.schedule_id, s.journey_date, s.departure_time,
        b.bus_number, b.total_seats, r.route_name, r.origin, r.destination
      ORDER BY s.journey_date DESC, s.departure_time ASC`,
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

module.exports = {
  getOverviewReport,
  getRevenueTrendReport,
  getPaymentMethodsReport,
  getRoutesReport,
  getOccupancyReport
};