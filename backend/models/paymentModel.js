const db = require('../config/database');

// Create new payment record
const createPayment = async (paymentData) => {
  const { booking_id, amount, payment_method, transaction_id, status } = paymentData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?)',
      [booking_id, amount, payment_method || 'PayHere', transaction_id, status || 'pending']
    );
    
    return {
      payment_id: result.insertId,
      booking_id,
      amount,
      payment_method: payment_method || 'PayHere',
      transaction_id,
      status: status || 'pending'
    };
  } catch (error) {
    throw error;
  }
};

// Get payment by ID
const getPaymentById = async (paymentId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE payment_id = ?',
      [paymentId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get payment by booking ID
const getPaymentByBookingId = async (bookingId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC LIMIT 1',
      [bookingId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get payment by transaction ID
const getPaymentByTransactionId = async (transactionId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE transaction_id = ?',
      [transactionId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Update payment status
const updatePaymentStatus = async (paymentId, status) => {
  try {
    const [result] = await db.query(
      'UPDATE payments SET status = ? WHERE payment_id = ?',
      [status, paymentId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get all payments
const getAllPayments = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        p.*,
        b.booking_reference, b.passenger_name, b.journey_date,
        u.username, u.email as user_email
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(filters.payment_method);
    }

    query += ' ORDER BY p.payment_date DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentByBookingId,
  getPaymentByTransactionId,
  updatePaymentStatus,
  getAllPayments
};