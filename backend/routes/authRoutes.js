const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validationMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;