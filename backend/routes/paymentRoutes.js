const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public route (PayHere server-to-server callback)
router.post('/notify', paymentController.handlePaymentNotification);

// Protected routes
router.post('/initiate', verifyToken, paymentController.initiatePayment);

// Return/cancel landing (frontend can call this to show message)
router.get('/status/:bookingRef', verifyToken, paymentController.getPaymentStatusByBookingRef);

// Manual verification (ADMIN ONLY) - secure this in real system
router.post('/verify/:bookingId', verifyToken, isAdmin, paymentController.verifyPaymentManually);

// Admin list
router.get('/', verifyToken, isAdmin, paymentController.getAllPayments);

module.exports = router;