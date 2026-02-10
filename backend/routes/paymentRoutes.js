const express = require('express');
const router = express.Router();

// Placeholder
router.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Payment routes - coming soon' 
  });
});

module.exports = router;