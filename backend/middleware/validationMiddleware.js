// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Sri Lankan format)
const validatePhone = (phone) => {
  const phoneRegex = /^(\+94|0)?[0-9]{9,10}$/;
  return phoneRegex.test(phone);
};

// Validate password strength
const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Registration validation middleware
const validateRegistration = (req, res, next) => {
  const { username, email, password, phone } = req.body;

  // Check required fields
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, and password are required.'
    });
  }

  // Validate email
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format.'
    });
  }

  // Validate password
  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.'
    });
  }

  // Validate phone if provided
  if (phone && !validatePhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Use format: +94XXXXXXXXX or 0XXXXXXXXX'
    });
  }

  // Validate username length
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Username must be between 3 and 50 characters.'
    });
  }

  next();
};

// Login validation middleware
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format.'
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePhone,
  validatePassword
};