const db = require('../config/database');

// Create a new booking
const createBooking = async (bookingData) => {
  const {
    user_id,
    schedule_id,
    seat_number,
    passenger_name,
    passenger_email,
    passenger_phone,
    total_amount,
    payment_status,
    booking_reference,
    verification_status
  } = bookingData;

  try {
    const [result] = await db.query(
      `INSERT INTO bookings 
       (user_id, schedule_id, seat_number, passenger_name, passenger_email, passenger_phone, 
        total_amount, payment_status, booking_reference, verification_status, booking_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, schedule_id, seat_number, passenger_name, passenger_email, passenger_phone,
       total_amount, payment_status, booking_reference, verification_status]
    );

    return {
      booking_id: result.insertId,
      user_id,
      schedule_id,
      seat_number,
      passenger_name,
      passenger_email,
      passenger_phone,
      total_amount,
      payment_status,
      booking_reference,
      verification_status
    };
  } catch (error) {
    throw error;
  }
};

// Get all bookings with filters
const getAllBookings = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name,
        bus.bus_number, bus.bus_name, bus.bus_type,
        u.username, u.email as user_email
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
      query += ' AND b.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.payment_status) {
      query += ' AND b.payment_status = ?';
      params.push(filters.payment_status);
    }

    if (filters.verification_status) {
      query += ' AND b.verification_status = ?';
      params.push(filters.verification_status);
    }

    if (filters.schedule_id) {
      query += ' AND b.schedule_id = ?';
      params.push(filters.schedule_id);
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
    const [rows] = await db.query(
      `SELECT 
        b.*,
        s.journey_date, s.departure_time, s.arrival_time,
        r.origin, r.destination, r.route_name, r.base_fare,
        bus.bus_number, bus.bus_name, bus.bus_type,
        u.username, u.email as user_email
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE b.booking_id = ?`,
      [bookingId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get booking by seat (check if seat is already booked)
const getBookingBySeat = async (schedule_id, seat_number) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bookings 
       WHERE schedule_id = ? 
       AND seat_number = ? 
       AND payment_status NOT IN ('refunded', 'failed')
       LIMIT 1`,
      [schedule_id, seat_number]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Update booking
const updateBooking = async (bookingId, updateData) => {
  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    fields.push(`${key} = ?`);
    values.push(updateData[key]);
  });

  values.push(bookingId);

  try {
    const [result] = await db.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE booking_id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete booking
const deleteBooking = async (bookingId) => {
  try {
    const [result] = await db.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get booking statistics
const getBookingStats = async () => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as paid_bookings,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN payment_status = 'pay_on_bus' THEN 1 ELSE 0 END) as pay_on_bus_bookings,
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
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingBySeat,
  updateBooking,
  deleteBooking,
  getBookingStats
};