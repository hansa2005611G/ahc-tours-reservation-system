const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', scheduleController.getAllSchedules);
router.get('/:id', scheduleController.getScheduleById);

// Protected routes (Admin only)
router.post('/', verifyToken, isAdmin, scheduleController.createSchedule);
router.put('/:id', verifyToken, isAdmin, scheduleController.updateSchedule);
router.delete('/:id', verifyToken, isAdmin, scheduleController.deleteSchedule);

module.exports = router;