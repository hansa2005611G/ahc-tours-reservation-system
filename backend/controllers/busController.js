const busModel = require('../models/busModel');

// @desc    Get all buses
// @route   GET /api/buses
// @access  Public
const getAllBuses = async (req, res) => {
  try {
    const { status, bus_type, search } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (bus_type) filters.bus_type = bus_type;
    if (search) filters.search = search;

    const buses = await busModel.getAllBuses(filters);

    res.json({
      success: true,
      count: buses.length,
      data: { buses }
    });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buses.',
      error: error.message
    });
  }
};

// @desc    Get single bus by ID
// @route   GET /api/buses/:id
// @access  Public
const getBusById = async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await busModel.getBusById(id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    res.json({
      success: true,
      data: { bus }
    });
  } catch (error) {
    console.error('Get bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bus.',
      error: error.message
    });
  }
};

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private/Admin
const createBus = async (req, res) => {
  try {
    const { bus_number, bus_name, total_seats, bus_type, status } = req.body;

    // Validation
    if (!bus_number || !total_seats) {
      return res.status(400).json({
        success: false,
        message: 'Bus number and total seats are required.'
      });
    }

    // Check if bus number already exists
    const existingBus = await busModel.getBusByNumber(bus_number);
    if (existingBus) {
      return res.status(400).json({
        success: false,
        message: 'Bus number already exists.'
      });
    }

    // Validate total seats
    if (total_seats < 10 || total_seats > 60) {
      return res.status(400).json({
        success: false,
        message: 'Total seats must be between 10 and 60.'
      });
    }

    // Validate bus type
    const validBusTypes = ['AC', 'Non-AC', 'Semi-Luxury', 'Luxury'];
    if (bus_type && !validBusTypes.includes(bus_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid bus type. Must be one of: ${validBusTypes.join(', ')}`
      });
    }

    // Create bus
    const newBus = await busModel.createBus({
      bus_number,
      bus_name,
      total_seats,
      bus_type,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Bus created successfully.',
      data: { bus: newBus }
    });
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bus.',
      error: error.message
    });
  }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private/Admin
const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if bus exists
    const existingBus = await busModel.getBusById(id);
    if (!existingBus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    // If updating bus number, check if new number already exists
    if (updateData.bus_number && updateData.bus_number !== existingBus.bus_number) {
      const busWithSameNumber = await busModel.getBusByNumber(updateData.bus_number);
      if (busWithSameNumber) {
        return res.status(400).json({
          success: false,
          message: 'Bus number already exists.'
        });
      }
    }

    // Validate total seats if provided
    if (updateData.total_seats) {
      if (updateData.total_seats < 10 || updateData.total_seats > 60) {
        return res.status(400).json({
          success: false,
          message: 'Total seats must be between 10 and 60.'
        });
      }
    }

    // Validate bus type if provided
    if (updateData.bus_type) {
      const validBusTypes = ['AC', 'Non-AC', 'Semi-Luxury', 'Luxury'];
      if (!validBusTypes.includes(updateData.bus_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid bus type. Must be one of: ${validBusTypes.join(', ')}`
        });
      }
    }

    // Update bus
    const updated = await busModel.updateBus(id, updateData);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update bus.'
      });
    }

    // Get updated bus data
    const updatedBus = await busModel.getBusById(id);

    res.json({
      success: true,
      message: 'Bus updated successfully.',
      data: { bus: updatedBus }
    });
  } catch (error) {
    console.error('Update bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bus.',
      error: error.message
    });
  }
};

// @desc    Delete bus
// @route   DELETE /api/buses/:id
// @access  Private/Admin
const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if bus exists
    const bus = await busModel.getBusById(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    // Check if bus is in use (has active schedules)
    const isInUse = await busModel.isBusInUse(id);
    if (isInUse) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bus. It has active schedules. Please cancel all schedules first or set status to inactive.'
      });
    }

    // Delete bus
    const deleted = await busModel.deleteBus(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete bus.'
      });
    }

    res.json({
      success: true,
      message: 'Bus deleted successfully.'
    });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bus.',
      error: error.message
    });
  }
};

// @desc    Get bus statistics
// @route   GET /api/buses/stats
// @access  Private/Admin
const getBusStatistics = async (req, res) => {
  try {
    const stats = await busModel.getBusStatistics();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get bus statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bus statistics.',
      error: error.message
    });
  }
};

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getBusStatistics
};