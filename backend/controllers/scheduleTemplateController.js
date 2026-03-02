const scheduleTemplateModel = require('../models/scheduleTemplateModel');

// @desc    Create schedule template
// @route   POST /api/schedule-templates
// @access  Private/Admin
const createTemplate = async (req, res) => {
  try {
    const {
      bus_id,
      route_id,
      departure_time,
      arrival_time,
      days_of_week,
      valid_from,
      valid_until
    } = req.body;

    const created_by = req.user.user_id;

    // Validation
    if (!bus_id || !route_id || !departure_time || !arrival_time || !days_of_week || !valid_from) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.'
      });
    }

    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one day of week must be selected.'
      });
    }

    const template = await scheduleTemplateModel.createTemplate({
      bus_id,
      route_id,
      departure_time,
      arrival_time,
      days_of_week,
      valid_from,
      valid_until,
      created_by
    });

    // Auto-generate schedules for next 30 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const schedules = await scheduleTemplateModel.generateSchedulesFromTemplate(
      template.template_id,
      today.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      created_by
    );

    res.status(201).json({
      success: true,
      message: `Template created and ${schedules.length} schedules generated for next 30 days.`,
      data: { template, schedules_generated: schedules.length }
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template.',
      error: error.message
    });
  }
};

// @desc    Get all templates
// @route   GET /api/schedule-templates
// @access  Private/Admin
const getAllTemplates = async (req, res) => {
  try {
    const { bus_id, route_id, is_active } = req.query;

    const filters = {};
    if (bus_id) filters.bus_id = bus_id;
    if (route_id) filters.route_id = route_id;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const templates = await scheduleTemplateModel.getAllTemplates(filters);

    res.json({
      success: true,
      count: templates.length,
      data: { templates }
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates.',
      error: error.message
    });
  }
};

// @desc    Get template by ID
// @route   GET /api/schedule-templates/:id
// @access  Private/Admin
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await scheduleTemplateModel.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found.'
      });
    }

    res.json({
      success: true,
      data: { template }
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template.',
      error: error.message
    });
  }
};

// @desc    Update template
// @route   PUT /api/schedule-templates/:id
// @access  Private/Admin
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await scheduleTemplateModel.updateTemplate(id, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Template not found.'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully.'
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template.',
      error: error.message
    });
  }
};

// @desc    Delete template
// @route   DELETE /api/schedule-templates/:id
// @access  Private/Admin
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await scheduleTemplateModel.deleteTemplate(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Template not found.'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully.'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template.',
      error: error.message
    });
  }
};

// @desc    Generate schedules from template
// @route   POST /api/schedule-templates/:id/generate
// @access  Private/Admin
const generateSchedules = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_range_start, date_range_end } = req.body;
    const generated_by = req.user.user_id;

    if (!date_range_start || !date_range_end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required.'
      });
    }

    const schedules = await scheduleTemplateModel.generateSchedulesFromTemplate(
      id,
      date_range_start,
      date_range_end,
      generated_by
    );

    res.json({
      success: true,
      message: `${schedules.length} schedules generated successfully.`,
      data: { schedules_generated: schedules.length, schedules }
    });
  } catch (error) {
    console.error('Generate schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating schedules.',
      error: error.message
    });
  }
};

// @desc    Auto-generate schedules for all active templates
// @route   POST /api/schedule-templates/auto-generate
// @access  Private/Admin
const autoGenerateAllSchedules = async (req, res) => {
  try {
    const result = await scheduleTemplateModel.autoGenerateSchedules();

    res.json({
      success: true,
      message: `Auto-generated ${result.totalGenerated} schedules from ${result.templatesProcessed} templates.`,
      data: result
    });
  } catch (error) {
    console.error('Auto-generate schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error auto-generating schedules.',
      error: error.message
    });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  generateSchedules,
  autoGenerateAllSchedules
};