const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const config = require('./config/config');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: [config.ADMIN_PANEL_URL, config.PASSENGER_WEBSITE_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for QR codes and uploads)
app.use('/uploads', express.static('uploads'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'AHC Tours API Server',
    status: 'Running',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Import routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes')); 
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes')); 
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));  

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Something went wrong!',
    error: config.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log(`✅ AHC Tours API Server Running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📁 Environment: ${config.NODE_ENV}`);
  console.log(`🗄️  Database: ${config.DB_NAME} on port ${config.DB_PORT}`);
  console.log('='.repeat(50));
  console.log('');
});

module.exports = app;