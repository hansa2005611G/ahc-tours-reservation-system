const cron = require('node-cron');
const scheduleTemplateModel = require('../models/scheduleTemplateModel');

// Run auto-generation every day at 2 AM
const startScheduleAutoGeneration = () => {
  // Cron syntax: minute hour day month day-of-week
  // '0 2 * * *' = At 2:00 AM every day
  
  cron.schedule('0 2 * * *', async () => {
    console.log('🤖 Running scheduled auto-generation of schedules...');
    
    try {
      const result = await scheduleTemplateModel.autoGenerateSchedules();
      console.log(`✅ Auto-generated ${result.totalGenerated} schedules from ${result.templatesProcessed} templates`);
    } catch (error) {
      console.error('❌ Auto-generation failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Colombo" // Sri Lankan timezone
  });

  console.log('⏰ Schedule auto-generation cron job started (runs daily at 2 AM)');
};

// Run auto-generation on server start (optional)
const runInitialGeneration = async () => {
  console.log('🚀 Running initial schedule generation...');
  try {
    const result = await scheduleTemplateModel.autoGenerateSchedules();
    console.log(`✅ Initial generation: ${result.totalGenerated} schedules from ${result.templatesProcessed} templates`);
  } catch (error) {
    console.error('❌ Initial generation failed:', error);
  }
};

module.exports = {
  startScheduleAutoGeneration,
  runInitialGeneration
};