const db = require('../config/database');

// Get all routes
const getAllRoutes = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM routes WHERE 1=1';
    const params = [];

    // Filter by origin
    if (filters.origin) {
      query += ' AND origin = ?';
      params.push(filters.origin);
    }

    // Filter by destination
    if (filters.destination) {
      query += ' AND destination = ?';
      params.push(filters.destination);
    }

    // Search by route name
    if (filters.search) {
      query += ' AND (route_name LIKE ? OR origin LIKE ? OR destination LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get route by ID
const getRouteById = async (routeId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM routes WHERE route_id = ?',
      [routeId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get route by origin and destination
const getRouteByOriginDestination = async (origin, destination) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM routes WHERE origin = ? AND destination = ?',
      [origin, destination]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create new route
const createRoute = async (routeData) => {
  const { route_name, origin, destination, distance_km, duration_hours, base_fare } = routeData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO routes (route_name, origin, destination, distance_km, duration_hours, base_fare) VALUES (?, ?, ?, ?, ?, ?)',
      [route_name, origin, destination, distance_km, duration_hours, base_fare]
    );
    
    return {
      route_id: result.insertId,
      route_name,
      origin,
      destination,
      distance_km,
      duration_hours,
      base_fare
    };
  } catch (error) {
    throw error;
  }
};

// Update route
const updateRoute = async (routeId, updateData) => {
  try {
    const fields = [];
    const values = [];

    if (updateData.route_name !== undefined) {
      fields.push('route_name = ?');
      values.push(updateData.route_name);
    }
    if (updateData.origin !== undefined) {
      fields.push('origin = ?');
      values.push(updateData.origin);
    }
    if (updateData.destination !== undefined) {
      fields.push('destination = ?');
      values.push(updateData.destination);
    }
    if (updateData.distance_km !== undefined) {
      fields.push('distance_km = ?');
      values.push(updateData.distance_km);
    }
    if (updateData.duration_hours !== undefined) {
      fields.push('duration_hours = ?');
      values.push(updateData.duration_hours);
    }
    if (updateData.base_fare !== undefined) {
      fields.push('base_fare = ?');
      values.push(updateData.base_fare);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(routeId);

    const [result] = await db.query(
      `UPDATE routes SET ${fields.join(', ')} WHERE route_id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete route
const deleteRoute = async (routeId) => {
  try {
    const [result] = await db.query(
      'DELETE FROM routes WHERE route_id = ?',
      [routeId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Check if route is in use
const isRouteInUse = async (routeId) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM schedules 
       WHERE route_id = ? AND status IN ('scheduled', 'departed')`,
      [routeId]
    );
    return rows[0].count > 0;
  } catch (error) {
    throw error;
  }
};

// Get popular routes (most booked)
const getPopularRoutes = async (limit = 5) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, COUNT(b.booking_id) as total_bookings
      FROM routes r
      LEFT JOIN schedules s ON r.route_id = s.route_id
      LEFT JOIN bookings b ON s.schedule_id = b.schedule_id
      GROUP BY r.route_id
      ORDER BY total_bookings DESC
      LIMIT ?
    `, [limit]);
    return rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllRoutes,
  getRouteById,
  getRouteByOriginDestination,
  createRoute,
  updateRoute,
  deleteRoute,
  isRouteInUse,
  getPopularRoutes
};