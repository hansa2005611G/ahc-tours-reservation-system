const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE /:id routes

// Admin-only specific routes (BEFORE /:id)
router.get('/search', verifyToken, isAdmin, busController.searchBuses);
router.get('/stats', verifyToken, isAdmin, busController.getBusStats);
router.get('/stats/overview', verifyToken, isAdmin, busController.getStats);
// Public routes
router.get('/', busController.getAllBuses);

// Admin CRUD routes
router.post('/', verifyToken, isAdmin, busController.createBus);

// Routes with :id parameter (AFTER specific routes)
router.get('/:id/status-history', verifyToken, isAdmin, busController.getBusStatusHistory);
router.put('/:id/status', verifyToken, isAdmin, busController.updateBusStatus);
router.get('/:id', busController.getBusById);
router.put('/:id', verifyToken, isAdmin, busController.updateBus);
router.delete('/:id', verifyToken, isAdmin, busController.deleteBus);


module.exports = router;