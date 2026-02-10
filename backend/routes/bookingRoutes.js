const express = require('express');
const router = express.Router();

// Placeholder
router.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Booking routes - coming soon' 
  });
});

module.exports = router;