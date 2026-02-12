const db = require('../config/database');

// Get all buses
const getAllBuses = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM buses WHERE 1=1';
    const params = [];

    // Filter by status
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Filter by bus type
    if (filters.bus_type) {
      query += ' AND bus_type = ?';
      params.push(filters.bus_type);
    }

    // Search by bus number or name
    if (filters.search) {
      query += ' AND (bus_number LIKE ? OR bus_name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get bus by ID
const getBusById = async (busId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM buses WHERE bus_id = ?',
      [busId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get bus by bus number
const getBusByNumber = async (busNumber) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM buses WHERE bus_number = ?',
      [busNumber]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create new bus
const createBus = async (busData) => {
  const { bus_number, bus_name, total_seats, bus_type, status } = busData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO buses (bus_number, bus_name, total_seats, bus_type, status) VALUES (?, ?, ?, ?, ?)',
      [bus_number, bus_name, total_seats, bus_type || 'Non-AC', status || 'active']
    );
    
    return {
      bus_id: result.insertId,
      bus_number,
      bus_name,
      total_seats,
      bus_type: bus_type || 'Non-AC',
      status: status || 'active'
    };
  } catch (error) {
    throw error;
  }
};

// Update bus
const updateBus = async (busId, updateData) => {
  try {
    const fields = [];
    const values = [];

    if (updateData.bus_number !== undefined) {
      fields.push('bus_number = ?');
      values.push(updateData.bus_number);
    }
    if (updateData.bus_name !== undefined) {
      fields.push('bus_name = ?');
      values.push(updateData.bus_name);
    }
    if (updateData.total_seats !== undefined) {
      fields.push('total_seats = ?');
      values.push(updateData.total_seats);
    }
    if (updateData.bus_type !== undefined) {
      fields.push('bus_type = ?');
      values.push(updateData.bus_type);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(busId);

    const [result] = await db.query(
      `UPDATE buses SET ${fields.join(', ')} WHERE bus_id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete bus
const deleteBus = async (busId) => {
  try {
    const [result] = await db.query(
      'DELETE FROM buses WHERE bus_id = ?',
      [busId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get bus statistics
const getBusStatistics = async () => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_buses,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_buses,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_buses,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_buses,
        SUM(total_seats) as total_capacity
      FROM buses
    `);
    return stats[0];
  } catch (error) {
    throw error;
  }
};

// Check if bus is in use (has active schedules)
const isBusInUse = async (busId) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM schedules 
       WHERE bus_id = ? AND status IN ('scheduled', 'departed')`,
      [busId]
    );
    return rows[0].count > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllBuses,
  getBusById,
  getBusByNumber,
  createBus,
  updateBus,
  deleteBus,
  getBusStatistics,
  isBusInUse
};