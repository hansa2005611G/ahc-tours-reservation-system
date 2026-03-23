const express = require('express');
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin guard middleware (since authMiddleware currently has only verifyToken)
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

router.get('/overview', verifyToken, adminOnly, reportController.getOverviewReport);
router.get('/revenue-trend', verifyToken, adminOnly, reportController.getRevenueTrendReport);
router.get('/payment-methods', verifyToken, adminOnly, reportController.getPaymentMethodsReport);
router.get('/routes', verifyToken, adminOnly, reportController.getRoutesReport);
router.get('/occupancy', verifyToken, adminOnly, reportController.getOccupancyReport);

module.exports = router;