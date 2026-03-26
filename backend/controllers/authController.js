const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const jwtConfig = require('../config/jwt');
const db = require('../config/database');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, phone, role } = req.body;

    const existingUserByEmail = await userModel.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const existingUserByUsername = await userModel.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await userModel.createUser({
      username,
      email,
      password_hash,
      phone,
      role: role || 'passenger'
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          user_id: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          is_active: Number(newUser.is_active ?? 1)
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Error registering user.', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username and password are required.'
      });
    }

    let user = null;
    if (email) user = await userModel.getUserByEmail(email);
    else user = await userModel.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    if (Number(user.is_active) === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact admin.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_active: Number(user.is_active ?? 1)
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error logging in.', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.user_id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          is_active: Number(user.is_active ?? 1)
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile.', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, email, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password.'
        });
      }

      const user = await userModel.getUserById(userId);
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      await userModel.updateUser(userId, { password_hash });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length > 0) {
      await userModel.updateUser(userId, updateData);
    }

    const updatedUser = await userModel.getUserById(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile.', error: error.message });
  }
};

// @desc    Get users with filters + pagination (admin)
// @route   GET /api/auth/users?search=&role=&status=&page=&limit=
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const search = (req.query.search || '').trim();
    const role = (req.query.role || '').trim();
    const status = (req.query.status || '').trim(); // active | inactive
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (search) {
      where.push('(username LIKE ? OR email LIKE ? OR phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role && ['admin', 'conductor', 'passenger'].includes(role)) {
      where.push('role = ?');
      params.push(role);
    }

    if (status === 'active') {
      where.push('is_active = 1');
    } else if (status === 'inactive') {
      where.push('is_active = 0');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereSql}`,
      params
    );

    const [users] = await db.query(
      `SELECT user_id, username, email, phone, role, is_active, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: countRows[0].total,
          page,
          limit,
          totalPages: Math.ceil(countRows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users.', error: error.message });
  }
};

// @desc    Create user by admin
// @route   POST /api/auth/users
// @access  Private/Admin
const createUserByAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'username, email, password, role are required.'
      });
    }

    if (!['admin', 'conductor', 'passenger'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const [existingEmail] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }

    const [existingUsername] = await db.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existingUsername.length) {
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, phone, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [username, email, password_hash, phone || null, role]
    );

    const [rows] = await db.query(
      `SELECT user_id, username, email, phone, role, is_active, created_at
       FROM users WHERE user_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { user: rows[0] }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user.', error: error.message });
  }
};

// @desc    Update user by admin
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUserByAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const userId = parseInt(req.params.id, 10);
    const { username, email, phone, role, password } = req.body;

    const [existing] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (role && !['admin', 'conductor', 'passenger'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    if (email) {
      const [emailRows] = await db.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      if (emailRows.length) {
        return res.status(409).json({ success: false, message: 'Email already in use.' });
      }
    }

    if (username) {
      const [usernameRows] = await db.query(
        'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
        [username, userId]
      );
      if (usernameRows.length) {
        return res.status(409).json({ success: false, message: 'Username already in use.' });
      }
    }

    const updates = [];
    const params = [];

    if (username !== undefined) { updates.push('username = ?'); params.push(username); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      params.push(password_hash);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);

    const [rows] = await db.query(
      `SELECT user_id, username, email, phone, role, is_active, created_at
       FROM users WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: { user: rows[0] }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user.', error: error.message });
  }
};

// @desc    Delete user by admin
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUserByAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const userId = parseInt(req.params.id, 10);

    if (req.user.user_id === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const [existing] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.query('DELETE FROM users WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user.', error: error.message });
  }
};

// @desc    Toggle user active status (admin)
// @route   PATCH /api/auth/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const userId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (typeof is_active === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'is_active is required (0 or 1).'
      });
    }

    if (req.user.user_id === userId && Number(is_active) === 0) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }

    const [existing] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.query(
      `UPDATE users SET is_active = ? WHERE user_id = ?`,
      [Number(is_active) ? 1 : 0, userId]
    );

    const [rows] = await db.query(
      `SELECT user_id, username, email, phone, role, is_active, created_at
       FROM users WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: `User ${Number(is_active) ? 'activated' : 'deactivated'} successfully.`,
      data: { user: rows[0] }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status.',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  toggleUserStatus
};
 
 
