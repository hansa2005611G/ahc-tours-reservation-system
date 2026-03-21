const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const { startScheduleAutoGeneration, runInitialGeneration } = require('./utils/scheduleCron');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

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

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

app.use('/api/', generalLimiter);

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
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes')); 
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/schedule-templates', require('./routes/scheduleTemplateRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes')); 
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));  
app.use('/api/cancellations', require('./routes/cancellationRoutes'));

// TEST ROUTES
app.use('/api/test', require('./routes/testRoutes'));

// 404 and global error handling
app.use(notFound);
app.use(errorHandler);



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
   

// Start schedule auto-generation cron job
startScheduleAutoGeneration();


module.exports = app;