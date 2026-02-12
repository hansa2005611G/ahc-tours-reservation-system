const scheduleModel = require('../models/scheduleModel');
const busModel = require('../models/busModel');
const routeModel = require('../models/routeModel');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Public
const getAllSchedules = async (req, res) => {
  try {
    const { journey_date, date_from, date_to, route_id, origin, destination, bus_id, status } = req.query;
    
    const filters = {};
    if (journey_date) filters.journey_date = journey_date;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (route_id) filters.route_id = route_id;
    if (origin) filters.origin = origin;
    if (destination) filters.destination = destination;
    if (bus_id) filters.bus_id = bus_id;
    if (status) filters.status = status;

    const schedules = await scheduleModel.getAllSchedules(filters);

    res.json({
      success: true,
      count: schedules.length,
      data: { schedules }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedules.',
      error: error.message
    });
  }
};

// @desc    Get single schedule by ID
// @route   GET /api/schedules/:id
// @access  Public
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await scheduleModel.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    // Get booked seats
    const bookedSeats = await scheduleModel.getBookedSeats(id);

    res.json({
      success: true,
      data: { 
        schedule,
        booked_seats: bookedSeats
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule.',
      error: error.message
    });
  }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private/Admin
const createSchedule = async (req, res) => {
  try {
    const { bus_id, route_id, departure_time, arrival_time, journey_date } = req.body;

    // Validation
    if (!bus_id || !route_id || !departure_time || !arrival_time || !journey_date) {
      return res.status(400).json({
        success: false,
        message: 'Bus, route, departure time, arrival time, and journey date are required.'
      });
    }

    // Check if bus exists
    const bus = await busModel.getBusById(bus_id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    // Check if bus is active
    if (bus.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Bus is not active. Please activate the bus first.'
      });
    }

    // Check if route exists
    const route = await routeModel.getRouteById(route_id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found.'
      });
    }

    // Check if bus is already scheduled at the same time
    const isScheduled = await scheduleModel.isBusScheduled(bus_id, journey_date, departure_time);
    if (isScheduled) {
      return res.status(400).json({
        success: false,
        message: 'Bus is already scheduled for this date and time.'
      });
    }

    // Validate journey date (must be future date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const journeyDateObj = new Date(journey_date);
    
    if (journeyDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Journey date must be today or a future date.'
      });
    }

    // Create schedule
    const scheduleId = await scheduleModel.createSchedule({
      bus_id,
      route_id,
      departure_time,
      arrival_time,
      journey_date,
      available_seats: bus.total_seats,
      status: 'scheduled'
    });

    // Get created schedule with full details
    const newSchedule = await scheduleModel.getScheduleById(scheduleId);

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully.',
      data: { schedule: newSchedule }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating schedule.',
      error: error.message
    });
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if schedule exists
    const existingSchedule = await scheduleModel.getScheduleById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    // If updating bus, check if bus is already scheduled
    if (updateData.bus_id || updateData.journey_date || updateData.departure_time) {
      const busId = updateData.bus_id || existingSchedule.bus_id;
      const journeyDate = updateData.journey_date || existingSchedule.journey_date;
      const departureTime = updateData.departure_time || existingSchedule.departure_time;

      const isScheduled = await scheduleModel.isBusScheduled(busId, journeyDate, departureTime, id);
      if (isScheduled) {
        return res.status(400).json({
          success: false,
          message: 'Bus is already scheduled for this date and time.'
        });
      }
    }

    // Update schedule
    const updated = await scheduleModel.updateSchedule(id, updateData);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update schedule.'
      });
    }

    // Get updated schedule data
    const updatedSchedule = await scheduleModel.getScheduleById(id);

    res.json({
      success: true,
      message: 'Schedule updated successfully.',
      data: { schedule: updatedSchedule }
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating schedule.',
      error: error.message
    });
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const schedule = await scheduleModel.getScheduleById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.'
      });
    }

    // Check if there are bookings
    const bookedSeats = await scheduleModel.getBookedSeats(id);
    if (bookedSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete schedule. There are existing bookings. Please cancel all bookings first.'
      });
    }

    // Delete schedule
    const deleted = await scheduleModel.deleteSchedule(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete schedule.'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully.'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule.',
      error: error.message
    });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule
};