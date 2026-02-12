const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes
router.get('/reference/:ref', bookingController.getBookingByReference);

// Protected routes (Authenticated users)
router.get('/', verifyToken, bookingController.getAllBookings);
router.get('/:id', verifyToken, bookingController.getBookingById);
router.post('/', verifyToken, bookingController.createBooking);
router.put('/:id/cancel', verifyToken, bookingController.cancelBooking);

// Admin only
router.get('/stats/overview', verifyToken, isAdmin, bookingController.getBookingStatistics);

module.exports = router;