const db = require('../config/database.js');

const getAllRoutes = async (filters = {}) => {
  let query = `
    SELECT 
      route_id, route_name, origin, destination, distance_km, duration_hours, base_fare
    FROM routes
    WHERE 1=1
  `;
  const params = [];

  if (filters.origin) {
    query += ` AND origin LIKE ?`;
    params.push(`%${filters.origin}%`);
  }

  if (filters.destination) {
    query += ` AND destination LIKE ?`;
    params.push(`%${filters.destination}%`);
  }

  if (filters.search) {
    query += ` AND (route_name LIKE ? OR origin LIKE ? OR destination LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  query += ` ORDER BY route_id DESC`;

  const [rows] = await db.query(query, params);
  return rows;
};

const getRouteById = async (id) => {
  const [rows] = await db.query(
    `SELECT route_id, route_name, origin, destination, distance_km, duration_hours, base_fare
     FROM routes
     WHERE route_id = ?`,
    [id]
  );
  return rows[0] || null;
};

const getRouteByOriginDestination = async (origin, destination) => {
  const [rows] = await db.query(
    `SELECT route_id, route_name, origin, destination, distance_km, duration_hours, base_fare
     FROM routes
     WHERE origin = ? AND destination = ?
     LIMIT 1`,
    [origin, destination]
  );
  return rows[0] || null;
};

const createRoute = async (routeData) => {
  const { route_name, origin, destination, distance_km, duration_hours, base_fare } = routeData;

  const [result] = await db.query(
    `INSERT INTO routes (route_name, origin, destination, distance_km, duration_hours, base_fare)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [route_name, origin, destination, distance_km ?? null, duration_hours ?? null, base_fare]
  );

  return getRouteById(result.insertId);
};

const updateRoute = async (id, updateData) => {
  const fields = [];
  const values = [];

  const allowed = ['route_name', 'origin', 'destination', 'distance_km', 'duration_hours', 'base_fare'];

  for (const key of allowed) {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  }

  if (fields.length === 0) return false;

  values.push(id);

  const [result] = await db.query(
    `UPDATE routes SET ${fields.join(', ')} WHERE route_id = ?`,
    values
  );

  return result.affectedRows > 0;
};

const deleteRoute = async (id) => {
  const [result] = await db.query(`DELETE FROM routes WHERE route_id = ?`, [id]);
  return result.affectedRows > 0;
};

const isRouteInUse = async (id) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM schedules WHERE route_id = ? AND is_cancelled = FALSE`,
    [id]
  );
  return rows[0].cnt > 0;
};

const getPopularRoutes = async (limit = 5) => {
  const [rows] = await db.query(
    `SELECT 
       r.route_id, r.route_name, r.origin, r.destination, r.base_fare,
       COUNT(b.booking_id) AS booking_count
     FROM routes r
     LEFT JOIN schedules s ON s.route_id = r.route_id
     LEFT JOIN bookings b ON b.schedule_id = s.schedule_id AND b.payment_status != 'refunded'
     GROUP BY r.route_id
     ORDER BY booking_count DESC
     LIMIT ?`,
    [Number(limit)]
  );
  return rows;
};

module.exports = {
  getAllRoutes,
  getRouteById,
  getRouteByOriginDestination,
  createRoute,
  updateRoute,
  deleteRoute,
  isRouteInUse,
  getPopularRoutes,

  // aliases (safe for older code)
  getRoutes: getAllRoutes
};