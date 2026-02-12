// Check if user has required role
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

// Specific role checkers
const isAdmin = checkRole('admin');
const isConductor = checkRole('conductor', 'admin');
const isPassenger = checkRole('passenger', 'admin');

module.exports = {
  checkRole,
  isAdmin,
  isConductor,
  isPassenger
};