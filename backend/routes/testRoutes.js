const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Test database connection
router.get('/db-test', async (req, res) => {
  try {
    const [result] = await db.query('SELECT 1 + 1 AS result');
    res.json({
      success: true,
      message: 'Database connected successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test users table
router.get('/users-test', async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, username, email, role FROM users LIMIT 5');
    res.json({
      success: true,
      message: 'Users table accessible',
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Users table error',
      error: error.message
    });
  }
});

// Test conductor user
router.get('/conductor-test', async (req, res) => {
  try {
    const [conductors] = await db.query(
      'SELECT user_id, username, email, role, full_name, phone FROM users WHERE role = ?',
      ['conductor']
    );
    res.json({
      success: true,
      message: 'Conductor users found',
      count: conductors.length,
      data: conductors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Conductor query error',
      error: error.message
    });
  }
});

// Test login endpoint (without authentication)
router.post('/login-test', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    res.json({
      success: true,
      message: 'Login test endpoint working',
      received: {
        username: username || 'not provided',
        email: email || 'not provided',
        password: password ? '***hidden***' : 'not provided'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login test error',
      error: error.message
    });
  }
});

module.exports = router;