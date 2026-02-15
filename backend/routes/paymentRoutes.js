// const express = require('express');
// const router = express.Router();
// const paymentController = require('../controllers/paymentController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isAdmin } = require('../middleware/roleMiddleware');

// // Public route (PayHere callback)
// router.post('/notify', paymentController.handlePaymentNotification);

// // Protected routes
// router.post('/initiate', verifyToken, paymentController.initiatePayment);

// // Admin only
// router.post('/verify/:bookingId', verifyToken, isAdmin, paymentController.verifyPaymentManually);
// router.get('/', verifyToken, isAdmin, paymentController.getAllPayments);

// module.exports = router;


const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public route (PayHere callback)
router.post('/notify', paymentController.handlePaymentNotification);

// Protected routes
router.post('/initiate', verifyToken, paymentController.initiatePayment);

// Manual verification - Remove admin auth for testing
router.post('/verify/:bookingId', paymentController.verifyPaymentManually); // ← Changed (removed auth)

// Admin only
router.get('/', verifyToken, isAdmin, paymentController.getAllPayments);

module.exports = router;