const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Passenger routes
router.post('/', verifyToken, cancellationController.requestCancellation);
router.get('/my-requests', verifyToken, cancellationController.getMyCancellationRequests);

// Admin routes
router.get('/', verifyToken, isAdmin, cancellationController.getAllCancellationRequests);
router.get('/stats/overview', verifyToken, isAdmin, cancellationController.getCancellationStats);
router.get('/:id', verifyToken, isAdmin, cancellationController.getCancellationRequestById);
router.put('/:id', verifyToken, isAdmin, cancellationController.processCancellationRequest);

module.exports = router;