const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', busController.getAllBuses);
router.get('/:id', busController.getBusById);

// Protected routes (Admin only)
router.post('/', verifyToken, isAdmin, busController.createBus);
router.put('/:id', verifyToken, isAdmin, busController.updateBus);
router.delete('/:id', verifyToken, isAdmin, busController.deleteBus);

// Statistics (Admin only)
router.get('/stats/overview', verifyToken, isAdmin, busController.getBusStatistics);

module.exports = router;