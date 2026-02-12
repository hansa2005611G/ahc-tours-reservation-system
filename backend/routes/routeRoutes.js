const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', routeController.getAllRoutes);
router.get('/popular/list', routeController.getPopularRoutes);
router.get('/:id', routeController.getRouteById);

// Protected routes (Admin only)
router.post('/', verifyToken, isAdmin, routeController.createRoute);
router.put('/:id', verifyToken, isAdmin, routeController.updateRoute);
router.delete('/:id', verifyToken, isAdmin, routeController.deleteRoute);

module.exports = router;