const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// Verify JWT Token
const verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

module.exports = { verifyToken };