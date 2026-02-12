const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const jwtConfig = require('../config/jwt');

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

    // Check if user already exists
    const existingUserByEmail = await userModel.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    const existingUserByUsername = await userModel.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await userModel.createUser({
      username,
      email,
      password_hash,
      phone,
      role: role || 'passenger'
    });

    // Generate token
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
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user.',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate token
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
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in.',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile.',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, email, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    // If changing password, verify current password
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

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      
      await userModel.updateUser(userId, { password_hash });
    }

    // Update other fields
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

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
    res.status(500).json({
      success: false,
      message: 'Error updating profile.',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};