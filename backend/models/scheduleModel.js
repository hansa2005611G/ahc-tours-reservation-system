const db = require('../config/database');

// Get all schedules with bus and route details
const getAllSchedules = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        s.*,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats,
        r.route_name, r.origin, r.destination, r.base_fare, r.distance_km, r.duration_hours
      FROM schedules s
      JOIN buses b ON s.bus_id = b.bus_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by journey date
    if (filters.journey_date) {
      query += ' AND s.journey_date = ?';
      params.push(filters.journey_date);
    }

    // Filter by date range
    if (filters.date_from) {
      query += ' AND s.journey_date >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ' AND s.journey_date <= ?';
      params.push(filters.date_to);
    }

    // Filter by route
    if (filters.route_id) {
      query += ' AND s.route_id = ?';
      params.push(filters.route_id);
    }

    // Filter by origin and destination
    if (filters.origin) {
      query += ' AND r.origin = ?';
      params.push(filters.origin);
    }
    if (filters.destination) {
      query += ' AND r.destination = ?';
      params.push(filters.destination);
    }

    // Filter by bus
    if (filters.bus_id) {
      query += ' AND s.bus_id = ?';
      params.push(filters.bus_id);
    }

    // Filter by status
    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY s.journey_date DESC, s.departure_time ASC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get schedule by ID
const getScheduleById = async (scheduleId) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.*,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats,
        r.route_name, r.origin, r.destination, r.base_fare, r.distance_km, r.duration_hours
      FROM schedules s
      JOIN buses b ON s.bus_id = b.bus_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE s.schedule_id = ?
    `, [scheduleId]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create new schedule
const createSchedule = async (scheduleData) => {
  const { bus_id, route_id, departure_time, arrival_time, journey_date, available_seats, status } = scheduleData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, journey_date, available_seats, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [bus_id, route_id, departure_time, arrival_time, journey_date, available_seats, status || 'scheduled']
    );
    
    return result.insertId;
  } catch (error) {
    throw error;
  }
};

// Update schedule
const updateSchedule = async (scheduleId, updateData) => {
  try {
    const fields = [];
    const values = [];

    if (updateData.bus_id !== undefined) {
      fields.push('bus_id = ?');
      values.push(updateData.bus_id);
    }
    if (updateData.route_id !== undefined) {
      fields.push('route_id = ?');
      values.push(updateData.route_id);
    }
    if (updateData.departure_time !== undefined) {
      fields.push('departure_time = ?');
      values.push(updateData.departure_time);
    }
    if (updateData.arrival_time !== undefined) {
      fields.push('arrival_time = ?');
      values.push(updateData.arrival_time);
    }
    if (updateData.journey_date !== undefined) {
      fields.push('journey_date = ?');
      values.push(updateData.journey_date);
    }
    if (updateData.available_seats !== undefined) {
      fields.push('available_seats = ?');
      values.push(updateData.available_seats);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(scheduleId);

    const [result] = await db.query(
      `UPDATE schedules SET ${fields.join(', ')} WHERE schedule_id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete schedule
const deleteSchedule = async (scheduleId) => {
  try {
    const [result] = await db.query(
      'DELETE FROM schedules WHERE schedule_id = ?',
      [scheduleId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Check if bus is already scheduled
const isBusScheduled = async (busId, journeyDate, departureTime, excludeScheduleId = null) => {
  try {
    let query = `
      SELECT COUNT(*) as count FROM schedules 
      WHERE bus_id = ? 
      AND journey_date = ? 
      AND departure_time = ?
      AND status IN ('scheduled', 'departed')
    `;
    const params = [busId, journeyDate, departureTime];

    if (excludeScheduleId) {
      query += ' AND schedule_id != ?';
      params.push(excludeScheduleId);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count > 0;
  } catch (error) {
    throw error;
  }
};

// Get booked seats for a schedule
const getBookedSeats = async (scheduleId) => {
  try {
    const [rows] = await db.query(
      'SELECT seat_number FROM bookings WHERE schedule_id = ? AND payment_status = "completed"',
      [scheduleId]
    );
    return rows.map(row => row.seat_number);
  } catch (error) {
    throw error;
  }
};

// Update available seats
const updateAvailableSeats = async (scheduleId, seatsToReduce) => {
  try {
    const [result] = await db.query(
      'UPDATE schedules SET available_seats = available_seats - ? WHERE schedule_id = ?',
      [seatsToReduce, scheduleId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  isBusScheduled,
  getBookedSeats,
  updateAvailableSeats
};