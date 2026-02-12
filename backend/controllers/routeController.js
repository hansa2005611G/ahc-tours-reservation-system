const routeModel = require('../models/routeModel');

// @desc    Get all routes
// @route   GET /api/routes
// @access  Public
const getAllRoutes = async (req, res) => {
  try {
    const { origin, destination, search } = req.query;
    
    const filters = {};
    if (origin) filters.origin = origin;
    if (destination) filters.destination = destination;
    if (search) filters.search = search;

    const routes = await routeModel.getAllRoutes(filters);

    res.json({
      success: true,
      count: routes.length,
      data: { routes }
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching routes.',
      error: error.message
    });
  }
};

// @desc    Get single route by ID
// @route   GET /api/routes/:id
// @access  Public
const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const route = await routeModel.getRouteById(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found.'
      });
    }

    res.json({
      success: true,
      data: { route }
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching route.',
      error: error.message
    });
  }
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Private/Admin
const createRoute = async (req, res) => {
  try {
    const { route_name, origin, destination, distance_km, duration_hours, base_fare } = req.body;

    // Validation
    if (!origin || !destination || !base_fare) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and base fare are required.'
      });
    }

    // Check if route already exists
    const existingRoute = await routeModel.getRouteByOriginDestination(origin, destination);
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'Route from this origin to destination already exists.'
      });
    }

    // Validate base fare
    if (base_fare < 0) {
      return res.status(400).json({
        success: false,
        message: 'Base fare must be a positive number.'
      });
    }

    // Create route name if not provided
    const finalRouteName = route_name || `${origin} to ${destination}`;

    // Create route
    const newRoute = await routeModel.createRoute({
      route_name: finalRouteName,
      origin,
      destination,
      distance_km,
      duration_hours,
      base_fare
    });

    res.status(201).json({
      success: true,
      message: 'Route created successfully.',
      data: { route: newRoute }
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating route.',
      error: error.message
    });
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private/Admin
const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if route exists
    const existingRoute = await routeModel.getRouteById(id);
    if (!existingRoute) {
      return res.status(404).json({
        success: false,
        message: 'Route not found.'
      });
    }

    // Validate base fare if provided
    if (updateData.base_fare !== undefined && updateData.base_fare < 0) {
      return res.status(400).json({
        success: false,
        message: 'Base fare must be a positive number.'
      });
    }

    // Update route
    const updated = await routeModel.updateRoute(id, updateData);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update route.'
      });
    }

    // Get updated route data
    const updatedRoute = await routeModel.getRouteById(id);

    res.json({
      success: true,
      message: 'Route updated successfully.',
      data: { route: updatedRoute }
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating route.',
      error: error.message
    });
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private/Admin
const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if route exists
    const route = await routeModel.getRouteById(id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found.'
      });
    }

    // Check if route is in use
    const isInUse = await routeModel.isRouteInUse(id);
    if (isInUse) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete route. It has active schedules.'
      });
    }

    // Delete route
    const deleted = await routeModel.deleteRoute(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete route.'
      });
    }

    res.json({
      success: true,
      message: 'Route deleted successfully.'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting route.',
      error: error.message
    });
  }
};

// @desc    Get popular routes
// @route   GET /api/routes/popular/list
// @access  Public
const getPopularRoutes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const routes = await routeModel.getPopularRoutes(limit);

    res.json({
      success: true,
      count: routes.length,
      data: { routes }
    });
  } catch (error) {
    console.error('Get popular routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular routes.',
      error: error.message
    });
  }
};

module.exports = {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getPopularRoutes
};