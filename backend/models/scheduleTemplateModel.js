const db = require('../config/database');

// Create schedule template
const createTemplate = async (templateData) => {
  const {
    bus_id,
    route_id,
    departure_time,
    arrival_time,
    days_of_week,
    valid_from,
    valid_until,
    created_by
  } = templateData;

  try {
    const [result] = await db.query(
      `INSERT INTO schedule_templates 
       (bus_id, route_id, departure_time, arrival_time, days_of_week, valid_from, valid_until, created_by, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [bus_id, route_id, departure_time, arrival_time, JSON.stringify(days_of_week), valid_from, valid_until, created_by]
    );

    return {
      template_id: result.insertId,
      ...templateData,
      is_active: true
    };
  } catch (error) {
    throw error;
  }
};

// Get all templates
const getAllTemplates = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        st.*,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats, b.status as bus_status,
        r.route_name, r.origin, r.destination, r.base_fare,
        u.username as created_by_name
      FROM schedule_templates st
      JOIN buses b ON st.bus_id = b.bus_id
      JOIN routes r ON st.route_id = r.route_id
      LEFT JOIN users u ON st.created_by = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.bus_id) {
      query += ' AND st.bus_id = ?';
      params.push(filters.bus_id);
    }

    if (filters.route_id) {
      query += ' AND st.route_id = ?';
      params.push(filters.route_id);
    }

    if (filters.is_active !== undefined) {
      query += ' AND st.is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY st.created_at DESC';

    const [rows] = await db.query(query, params);
    
    // Parse JSON days_of_week
    return rows.map(row => ({
      ...row,
      days_of_week: JSON.parse(row.days_of_week)
    }));
  } catch (error) {
    throw error;
  }
};

// Get template by ID
const getTemplateById = async (templateId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        st.*,
        b.bus_number, b.bus_name, b.bus_type, b.total_seats, b.status as bus_status,
        r.route_name, r.origin, r.destination, r.base_fare
      FROM schedule_templates st
      JOIN buses b ON st.bus_id = b.bus_id
      JOIN routes r ON st.route_id = r.route_id
      WHERE st.template_id = ?`,
      [templateId]
    );
    
    if (rows[0]) {
      rows[0].days_of_week = JSON.parse(rows[0].days_of_week);
    }
    
    return rows[0];
  } catch (error) {
    throw error;
  }
};

// Update template
const updateTemplate = async (templateId, updateData) => {
  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (key === 'days_of_week') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(updateData[key]));
    } else {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  values.push(templateId);

  try {
    const [result] = await db.query(
      `UPDATE schedule_templates SET ${fields.join(', ')} WHERE template_id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Delete template
const deleteTemplate = async (templateId) => {
  try {
    const [result] = await db.query('DELETE FROM schedule_templates WHERE template_id = ?', [templateId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

// Generate schedules from template
const generateSchedulesFromTemplate = async (templateId, dateRangeStart, dateRangeEnd, generatedBy = null) => {
  try {
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if bus is active
    if (template.bus_status !== 'active') {
      throw new Error(`Bus ${template.bus_number} is ${template.bus_status}. Cannot generate schedules.`);
    }

    const schedules = [];
    const startDate = new Date(dateRangeStart);
    const endDate = new Date(dateRangeEnd);
    
    // Generate schedules for each day in range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      // Check if this day is in the template's days_of_week
      if (template.days_of_week.includes(dayOfWeek)) {
        // Check if schedule already exists for this date
        const [existing] = await db.query(
          `SELECT schedule_id FROM schedules 
           WHERE bus_id = ? AND route_id = ? AND journey_date = ? AND departure_time = ?`,
          [template.bus_id, template.route_id, date.toISOString().split('T')[0], template.departure_time]
        );

        if (existing.length === 0) {
          // Create schedule
          const [result] = await db.query(
            `INSERT INTO schedules 
             (bus_id, route_id, departure_time, arrival_time, journey_date, available_seats, 
              template_id, is_auto_generated, generation_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), 'scheduled')`,
            [
              template.bus_id,
              template.route_id,
              template.departure_time,
              template.arrival_time,
              date.toISOString().split('T')[0],
              template.total_seats,
              templateId
            ]
          );

          schedules.push({
            schedule_id: result.insertId,
            journey_date: date.toISOString().split('T')[0]
          });
        }
      }
    }

    // Log generation
    await db.query(
      `INSERT INTO schedule_generation_log 
       (template_id, schedules_created, date_range_start, date_range_end, generated_by, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateId, schedules.length, dateRangeStart, dateRangeEnd, generatedBy, 'success']
    );

    return schedules;
  } catch (error) {
    // Log failed generation
    try {
      await db.query(
        `INSERT INTO schedule_generation_log 
         (template_id, schedules_created, date_range_start, date_range_end, generated_by, status, error_message) 
         VALUES (?, 0, ?, ?, ?, 'failed', ?)`,
        [templateId, dateRangeStart, dateRangeEnd, generatedBy, error.message]
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    throw error;
  }
};

// Auto-generate schedules for all active templates (30 days ahead)
const autoGenerateSchedules = async () => {
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const templates = await getAllTemplates({ is_active: true });
    let totalGenerated = 0;

    for (const template of templates) {
      // Skip if bus is not active
      if (template.bus_status !== 'active') {
        console.log(`⏭️ Skipping template ${template.template_id} - Bus ${template.bus_number} is ${template.bus_status}`);
        continue;
      }

      try {
        const schedules = await generateSchedulesFromTemplate(
          template.template_id,
          today.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        totalGenerated += schedules.length;
        console.log(`✅ Generated ${schedules.length} schedules for template ${template.template_id}`);
      } catch (error) {
        console.error(`❌ Error generating schedules for template ${template.template_id}:`, error.message);
      }
    }

    return { totalGenerated, templatesProcessed: templates.length };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  generateSchedulesFromTemplate,
  autoGenerateSchedules
};