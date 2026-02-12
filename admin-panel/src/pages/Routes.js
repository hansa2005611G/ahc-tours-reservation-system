import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { routeAPI } from '../services/api';

const Routes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    route_name: '',
    origin: '',
    destination: '',
    distance_km: '',
    duration_hours: '',
    base_fare: ''
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await routeAPI.getAll();
      setRoutes(response.data.data.routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (route = null) => {
    if (route) {
      setEditMode(true);
      setSelectedRoute(route);
      setFormData({
        route_name: route.route_name,
        origin: route.origin,
        destination: route.destination,
        distance_km: route.distance_km || '',
        duration_hours: route.duration_hours || '',
        base_fare: route.base_fare
      });
    } else {
      setEditMode(false);
      setSelectedRoute(null);
      setFormData({
        route_name: '',
        origin: '',
        destination: '',
        distance_km: '',
        duration_hours: '',
        base_fare: ''
      });
    }
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedRoute(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editMode) {
        await routeAPI.update(selectedRoute.route_id, formData);
        setSuccess('Route updated successfully!');
      } else {
        await routeAPI.create(formData);
        setSuccess('Route created successfully!');
      }
      fetchRoutes();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await routeAPI.delete(routeId);
        setSuccess('Route deleted successfully!');
        fetchRoutes();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Delete failed');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const filteredRoutes = routes.filter(
    (route) =>
      route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.route_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Route Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Route
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by route name, origin, or destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Route Name</strong></TableCell>
              <TableCell><strong>Origin</strong></TableCell>
              <TableCell><strong>Destination</strong></TableCell>
              <TableCell><strong>Distance (km)</strong></TableCell>
              <TableCell><strong>Duration (hrs)</strong></TableCell>
              <TableCell><strong>Base Fare (LKR)</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No routes found
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutes.map((route) => (
                <TableRow key={route.route_id} hover>
                  <TableCell>{route.route_name}</TableCell>
                  <TableCell>{route.origin}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>{route.distance_km || '-'}</TableCell>
                  <TableCell>{route.duration_hours || '-'}</TableCell>
                  <TableCell>{route.base_fare}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(route)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(route.route_id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Route' : 'Add New Route'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Route Name"
              name="route_name"
              value={formData.route_name}
              onChange={handleChange}
              margin="normal"
              placeholder="e.g., Colombo - Kandy Express"
            />

            <TextField
              fullWidth
              label="Origin"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              margin="normal"
              required
              placeholder="e.g., Colombo"
            />

            <TextField
              fullWidth
              label="Destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              margin="normal"
              required
              placeholder="e.g., Kandy"
            />

            <TextField
              fullWidth
              label="Distance (km)"
              name="distance_km"
              type="number"
              value={formData.distance_km}
              onChange={handleChange}
              margin="normal"
              inputProps={{ step: '0.1' }}
            />

            <TextField
              fullWidth
              label="Duration (hours)"
              name="duration_hours"
              type="number"
              value={formData.duration_hours}
              onChange={handleChange}
              margin="normal"
              inputProps={{ step: '0.5' }}
            />

            <TextField
              fullWidth
              label="Base Fare (LKR)"
              name="base_fare"
              type="number"
              value={formData.base_fare}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ min: 0 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Routes;