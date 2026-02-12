const db = require('../config/database');

// Get user by email
const getUserByEmail = async (email) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get user by username
const getUserByUsername = async (username) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, email, phone, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Create new user
const createUser = async (userData) => {
  const { username, email, password_hash, phone, role } = userData;
  
  try {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, password_hash, phone || null, role || 'passenger']
    );
    
    return {
      user_id: result.insertId,
      username,
      email,
      phone,
      role: role || 'passenger'
    };
  } catch (error) {
    throw error;
  }
};

// Update user
const updateUser = async (userId, updateData) => {
  try {
    const fields = [];
    const values = [];

    if (updateData.username) {
      fields.push('username = ?');
      values.push(updateData.username);
    }
    if (updateData.email) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.phone) {
      fields.push('phone = ?');
      values.push(updateData.phone);
    }
    if (updateData.password_hash) {
      fields.push('password_hash = ?');
      values.push(updateData.password_hash);
    }

    values.push(userId);

    const [result] = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete user
const deleteUser = async (userId) => {
  try {
    const [result] = await db.query(
      'DELETE FROM users WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Get all users (admin only)
const getAllUsers = async (role = null) => {
  try {
    let query = 'SELECT user_id, username, email, phone, role, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllUsers
};