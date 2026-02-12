const db = require('../config/database');

// Generate unique booking reference
const generateBookingReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `AHC-${timestamp}-${random}`;
};

// Get all bookings
const getAllBookings = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        b.*,
        s.departure_time, s.arrival_time, s.journey_date,
        bus.bus_number, bus.bus_name, bus.bus_type,
        r.route_name, r.origin, r.destination,
        u.username, u.email as user_email, u.phone as user_phone
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by user
    if (filters.user_id) {
      query += ' AND b.user_id = ?';
      params.push(filters.user_id);
    }

    // Filter by schedule
    if (filters.schedule_id) {
      query += ' AND b.schedule_id = ?';
      params.push(filters.schedule_id);
    }

    // Filter by payment status
    if (filters.payment_status) {
      query += ' AND b.payment_status = ?';
      params.push(filters.payment_status);
    }

    // Filter by verification status
    if (filters.verification_status) {
      query += ' AND b.verification_status = ?';
      params.push(filters.verification_status);
    }

    // Filter by booking reference
    if (filters.booking_reference) {
      query += ' AND b.booking_reference = ?';
      params.push(filters.booking_reference);
    }

    // Filter by journey date
    if (filters.journey_date) {
      query += ' AND b.journey_date = ?';
      params.push(filters.journey_date);
    }

    query += ' ORDER BY b.booking_date DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get booking by ID
const getBookingById = async (bookingId) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.*,
        s.departure_time, s.arrival_time, s.journey_date,
        bus.bus_number, bus.bus_name, bus.bus_type,
        r.route_name, r.origin, r.destination, r.base_fare,
        u.username, u.email as user_email, u.phone as user_phone
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN users u ON b.user_id = u.user_id
      WHERE b.booking_id = ?
    `, [bookingId]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get booking by reference
const getBookingByReference = async (bookingReference) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.*,
        s.departure_time, s.arrival_time, s.journey_date,
        bus.bus_number, bus.bus_name, bus.bus_type,
        r.route_name, r.origin, r.destination, r.base_fare,
        u.username, u.email as user_email, u.phone as user_phone
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN users u ON b.user_id = u.user_id
      WHERE b.booking_reference = ?
    `, [bookingReference]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create new booking
const createBooking = async (bookingData) => {
  const {
    user_id,
    schedule_id,
    seat_number,
    passenger_name,
    passenger_email,
    passenger_phone,
    journey_date,
    total_amount
  } = bookingData;

  const booking_reference = generateBookingReference();
  
  try {
    const [result] = await db.query(
      `INSERT INTO bookings 
      (booking_reference, user_id, schedule_id, seat_number, passenger_name, 
       passenger_email, passenger_phone, journey_date, total_amount, payment_status, verification_status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [booking_reference, user_id, schedule_id, seat_number, passenger_name, 
       passenger_email, passenger_phone, journey_date, total_amount]
    );
    
    return {
      booking_id: result.insertId,
      booking_reference
    };
  } catch (error) {
    throw error;
  }
};

// Update booking
const updateBooking = async (bookingId, updateData) => {
  try {
    const fields = [];
    const values = [];

    if (updateData.payment_status !== undefined) {
      fields.push('payment_status = ?');
      values.push(updateData.payment_status);
    }
    if (updateData.verification_status !== undefined) {
      fields.push('verification_status = ?');
      values.push(updateData.verification_status);
    }
    if (updateData.qr_code !== undefined) {
      fields.push('qr_code = ?');
      values.push(updateData.qr_code);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(bookingId);

    const [result] = await db.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE booking_id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Cancel booking (refund)
const cancelBooking = async (bookingId) => {
  try {
    const [result] = await db.query(
      'UPDATE bookings SET payment_status = "refunded" WHERE booking_id = ?',
      [bookingId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Check if seat is available
const isSeatAvailable = async (scheduleId, seatNumber) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE schedule_id = ? AND seat_number = ? AND payment_status IN ('pending', 'completed')`,
      [scheduleId, seatNumber]
    );
    return rows[0].count === 0;
  } catch (error) {
    throw error;
  }
};

// Get booking statistics
const getBookingStatistics = async () => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_bookings,
        SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
      FROM bookings
    `);
    return stats[0];
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  getBookingByReference,
  createBooking,
  updateBooking,
  cancelBooking,
  isSeatAvailable,
  getBookingStatistics,
  generateBookingReference
};