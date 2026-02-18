const db = require('../config/database');

// Create cancellation request
const createCancellationRequest = async (cancellationData) => {
  const { booking_id, user_id, reason } = cancellationData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO cancellation_requests (booking_id, user_id, reason, status) VALUES (?, ?, ?, ?)',
      [booking_id, user_id, reason, 'pending']
    );
    
    return {
      cancellation_id: result.insertId,
      booking_id,
      user_id,
      reason,
      status: 'pending'
    };
  } catch (error) {
    throw error;
  }
};

// Get all cancellation requests
const getAllCancellationRequests = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        cr.*,
        b.booking_reference, b.total_amount, b.seat_number, b.journey_date,
        b.passenger_name, b.passenger_email, b.passenger_phone,
        s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name,
        u.username as requester_name,
        admin.username as processed_by_name
      FROM cancellation_requests cr
      JOIN bookings b ON cr.booking_id = b.booking_id
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN users u ON cr.user_id = u.user_id
      LEFT JOIN users admin ON cr.processed_by = admin.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND cr.status = ?';
      params.push(filters.status);
    }

    if (filters.booking_id) {
      query += ' AND cr.booking_id = ?';
      params.push(filters.booking_id);
    }

    query += ' ORDER BY cr.request_date DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get cancellation request by ID
const getCancellationRequestById = async (cancellationId) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        cr.*,
        b.booking_reference, b.total_amount, b.seat_number, b.journey_date,
        b.passenger_name, b.passenger_email, b.passenger_phone,
        s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name,
        u.username as requester_name
      FROM cancellation_requests cr
      JOIN bookings b ON cr.booking_id = b.booking_id
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN users u ON cr.user_id = u.user_id
      WHERE cr.cancellation_id = ?
    `, [cancellationId]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get cancellation request by booking ID
const getCancellationByBookingId = async (bookingId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM cancellation_requests WHERE booking_id = ? ORDER BY request_date DESC LIMIT 1',
      [bookingId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Update cancellation request status
const updateCancellationRequest = async (cancellationId, updateData) => {
  const { status, admin_remarks, processed_by, refund_amount } = updateData;
  
  try {
    const [result] = await db.query(
      `UPDATE cancellation_requests 
       SET status = ?, admin_remarks = ?, processed_by = ?, processed_date = NOW(), refund_amount = ?
       WHERE cancellation_id = ?`,
      [status, admin_remarks, processed_by, refund_amount, cancellationId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get cancellation statistics
const getCancellationStats = async () => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
        SUM(CASE WHEN status = 'approved' THEN refund_amount ELSE 0 END) as total_refunds
      FROM cancellation_requests
    `);
    return stats[0];
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCancellationRequest,
  getAllCancellationRequests,
  getCancellationRequestById,
  getCancellationByBookingId,
  updateCancellationRequest,
  getCancellationStats
};