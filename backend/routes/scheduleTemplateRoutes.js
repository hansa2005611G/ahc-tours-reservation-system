const express = require('express');
const router = express.Router();
const scheduleTemplateController = require('../controllers/scheduleTemplateController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// All routes require admin access
router.use(verifyToken, isAdmin);

// Template CRUD
router.post('/', scheduleTemplateController.createTemplate);
router.get('/', scheduleTemplateController.getAllTemplates);
router.get('/:id', scheduleTemplateController.getTemplateById);
router.put('/:id', scheduleTemplateController.updateTemplate);
router.delete('/:id', scheduleTemplateController.deleteTemplate);

// Schedule generation
router.post('/:id/generate', scheduleTemplateController.generateSchedules);
router.post('/auto-generate', scheduleTemplateController.autoGenerateAllSchedules);

module.exports = router;