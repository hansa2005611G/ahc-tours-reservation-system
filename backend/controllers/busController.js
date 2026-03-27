const db = require('../config/database');
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

// @desc    Get bus statistics overview
// @route   GET /api/buses/stats/overview
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_buses,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_buses,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_buses,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_buses,
        SUM(total_seats) as total_capacity
      FROM buses
    `);

    res.json({
      success: true,
      data: {
        stats: stats || {
          total_buses: 0,
          active_buses: 0,
          inactive_buses: 0,
          maintenance_buses: 0,
          total_capacity: 0
        }
      }
    });
  } catch (error) {
    console.error('Bus stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bus statistics',
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
const getBusStats = async (req, res) => {
  try {
    const stats = await busModel.getBusStats();

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

// @desc    Update bus status
// @route   PUT /api/buses/:id/status
// @access  Private/Admin
const updateBusStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.user.user_id;

    // Validation
    if (!status || !['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (active, inactive, or maintenance).'
      });
    }

    if ((status === 'inactive' || status === 'maintenance') && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when setting bus to inactive or maintenance.'
      });
    }

    await busModel.updateBusStatus(id, { status, reason }, userId);

    res.json({
      success: true,
      message: `Bus status updated to ${status} successfully.`
    });
  } catch (error) {
    console.error('Update bus status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bus status.',
      error: error.message
    });
  }
};

// @desc    Get bus status history
// @route   GET /api/buses/:id/status-history
// @access  Private/Admin
const getBusStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await busModel.getBusStatusHistory(id);

    res.json({
      success: true,
      count: history.length,
      data: { history }
    });
  } catch (error) {
    console.error('Get bus status history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bus status history.',
      error: error.message
    });
  }
};

// @desc    Search buses by status
// @route   GET /api/buses/search
// @access  Private/Admin
const searchBuses = async (req, res) => {
  try {
    const { q, status } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required.'
      });
    }

    const buses = await busModel.searchBusesByStatus(q, status);

    res.json({
      success: true,
      count: buses.length,
      data: { buses }
    });
  } catch (error) {
    console.error('Search buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching buses.',
      error: error.message
    });
  }
};

// ✅ SINGLE module.exports with ALL functions
module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getBusStats,
  updateBusStatus,
  getBusStatusHistory,
  getStats,
  searchBuses
};