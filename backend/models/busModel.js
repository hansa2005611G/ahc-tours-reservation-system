const db = require('../config/database');

// Get all buses
const getAllBuses = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM buses WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.bus_type) {
      query += ' AND bus_type = ?';
      params.push(filters.bus_type);
    }

    if (filters.search) {
      query += ' AND (bus_number LIKE ? OR bus_name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY bus_number';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// Get bus by ID
const getBusById = async (busId) => {
  try {
    const [rows] = await db.query('SELECT * FROM buses WHERE bus_id = ?', [busId]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get bus by bus number
const getBusByNumber = async (busNumber) => {
  try {
    const [rows] = await db.query('SELECT * FROM buses WHERE bus_number = ?', [busNumber]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create a new bus
const createBus = async (busData) => {
  const { bus_number, bus_name, bus_type, total_seats, status } = busData;

  try {
    const [result] = await db.query(
      `INSERT INTO buses (bus_number, bus_name, bus_type, total_seats, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [bus_number, bus_name, bus_type || 'Non-AC', total_seats, status || 'active']
    );

    return {
      bus_id: result.insertId,
      bus_number,
      bus_name,
      bus_type: bus_type || 'Non-AC',
      total_seats,
      status: status || 'active'
    };
  } catch (error) {
    throw error;
  }
};

// Update bus
const updateBus = async (busId, updateData) => {
  const ALLOWED_FIELDS = new Set([
    'bus_number', 'bus_name', 'bus_type', 'total_seats', 'status',
    'status_reason', 'status_updated_at', 'status_updated_by'
  ]);

  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (ALLOWED_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(busId);

  try {
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
    const [result] = await db.query('DELETE FROM buses WHERE bus_id = ?', [busId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get bus statistics
const getBusStats = async () => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_buses,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_buses,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_buses,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_buses,
        SUM(total_seats) as total_capacity
      FROM buses
    `);
    return stats[0];
  } catch (error) {
    throw error;
  }
};

// Check if bus is in use
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

// Update bus status
const updateBusStatus = async (busId, statusData, userId) => {
  const { status, reason } = statusData;

  try {
    // Get current status
    const [currentBus] = await db.query('SELECT status FROM buses WHERE bus_id = ?', [busId]);
    
    if (currentBus.length === 0) {
      throw new Error('Bus not found');
    }

    const previousStatus = currentBus[0].status;

    // Update bus status
    await db.query(
      `UPDATE buses 
       SET status = ?, status_reason = ?, status_updated_at = NOW(), status_updated_by = ? 
       WHERE bus_id = ?`,
      [status, reason, userId, busId]
    );

    // Log status change
    await db.query(
      `INSERT INTO bus_status_history (bus_id, previous_status, new_status, reason, changed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [busId, previousStatus, status, reason, userId]
    );

    // If bus is set to inactive/maintenance, cancel future schedules
    if (status !== 'active') {
      await db.query(
        `UPDATE schedules 
         SET is_cancelled = TRUE, cancellation_reason = ?, cancelled_at = NOW(), cancelled_by = ? 
         WHERE bus_id = ? AND journey_date >= CURDATE() AND is_cancelled = FALSE`,
        [reason || `Bus set to ${status}`, userId, busId]
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// Get bus status history
const getBusStatusHistory = async (busId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        bsh.*,
        u.username as changed_by_name
      FROM bus_status_history bsh
      LEFT JOIN users u ON bsh.changed_by = u.user_id
      WHERE bsh.bus_id = ?
      ORDER BY bsh.changed_at DESC`,
      [busId]
    );
    return rows;
  } catch (error) {
    throw error;
  }
};

// Search buses by status
const searchBusesByStatus = async (searchTerm, status = null) => {
  try {
    let query = `
      SELECT * FROM buses 
      WHERE (bus_number LIKE ? OR bus_name LIKE ? OR bus_type LIKE ?)
    `;
    const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY bus_number';

    const [rows] = await db.query(query, params);
    return rows;
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
  getBusStats,
  isBusInUse,
  updateBusStatus,
  getBusStatusHistory,
  searchBusesByStatus
};