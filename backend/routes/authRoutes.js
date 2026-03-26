const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validateRegistration, validateLogin } = require('../middleware/validationMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);

// Admin user management
router.get('/users', verifyToken, authController.getAllUsers);
router.post('/users', verifyToken, authController.createUserByAdmin);
router.put('/users/:id', verifyToken, authController.updateUserByAdmin);
router.delete('/users/:id', verifyToken, authController.deleteUserByAdmin);
router.patch('/users/:id/status', verifyToken, authController.toggleUserStatus);

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('═══════════════════════════════════════');
    console.log('🔐 LOGIN ATTEMPT');
    console.log('═══════════════════════════════════════');
    console.log('Request body:', req.body);
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password provided:', password ? 'YES' : 'NO');
    console.log('═══════════════════════════════════════');

    // Validate input
    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (!username && !email) {
      console.log('❌ No username or email provided');
      return res.status(400).json({
        success: false,
        message: 'Username or email is required'
      });
    }

    // Find user by username OR email
    let query = 'SELECT * FROM users WHERE ';
    let params = [];

    if (email) {
      query += 'email = ?';
      params.push(email);
      console.log('🔍 Searching by email:', email);
    } else if (username) {
      query += 'username = ?';
      params.push(username);
      console.log('🔍 Searching by username:', username);
    }

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

    const [users] = await db.query(query, params);

    console.log('Users found:', users.length);

    if (users.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];
    console.log('✅ User found:', {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Check password
    console.log('🔐 Checking password...');
    console.log('Hash in DB length:', user.password_hash ? user.password_hash.length : 0);
    
    const isMatch = await bcrypt.compare(password, user.password_hash);

    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Password matches!');

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Token generated');
    console.log('═══════════════════════════════════════');

    // Return user data (exclude password)
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.log('═══════════════════════════════════════');
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Register Conductor
router.post('/register-conductor', async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    console.log('═══════════════════════════════════════');
    console.log('📝 CONDUCTOR REGISTRATION ATTEMPT');
    console.log('═══════════════════════════════════════');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Full Name:', full_name);
    console.log('Phone:', phone);

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if username already exists
    const [existingUsername] = await db.query(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      console.log('❌ Username already exists');
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const [existingEmail] = await db.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      console.log('❌ Email already exists');
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new conductor
    console.log('💾 Creating conductor account...');
    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, created_at) 
       VALUES (?, ?, ?, 'conductor', ?, ?, NOW())`,
      [username, email, hashedPassword, full_name || null, phone || null]
    );

    const userId = result.insertId;
    console.log('✅ Conductor created with ID:', userId);

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: userId, 
        username: username,
        role: 'conductor' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Registration successful!');
    console.log('═══════════════════════════════════════');

    // Return user data
    res.status(201).json({
      success: true,
      message: 'Conductor registered successfully',
      data: {
        token,
        user: {
          user_id: userId,
          username: username,
          email: email,
          role: 'conductor',
          full_name: full_name || null,
          phone: phone || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    console.log('═══════════════════════════════════════');
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});
module.exports = router;

