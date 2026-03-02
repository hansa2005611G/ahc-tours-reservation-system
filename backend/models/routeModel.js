const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// QR verification
router.post('/verify', qrController.verifyQRCode);
router.post('/mark-used', qrController.markTicketAsUsed);

// Schedule & booking info
router.get('/today-schedules', qrController.getTodaySchedules);
router.get('/schedule/:schedule_id/bookings', qrController.getScheduleBookings);

module.exports = router;