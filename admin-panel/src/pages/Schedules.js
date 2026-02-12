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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { scheduleAPI, busAPI, routeAPI } from '../services/api';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    bus_id: '',
    route_id: '',
    departure_time: '',
    arrival_time: '',
    journey_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, busesRes, routesRes] = await Promise.all([
        scheduleAPI.getAll(),
        busAPI.getAll(),
        routeAPI.getAll()
      ]);
      setSchedules(schedulesRes.data.data.schedules);
      setBuses(busesRes.data.data.buses);
      setRoutes(routesRes.data.data.routes);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditMode(true);
      setSelectedSchedule(schedule);
      setFormData({
        bus_id: schedule.bus_id,
        route_id: schedule.route_id,
        departure_time: schedule.departure_time,
        arrival_time: schedule.arrival_time,
        journey_date: schedule.journey_date
      });
    } else {
      setEditMode(false);
      setSelectedSchedule(null);
      setFormData({
        bus_id: '',
        route_id: '',
        departure_time: '',
        arrival_time: '',
        journey_date: ''
      });
    }
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedSchedule(null);
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
        await scheduleAPI.update(selectedSchedule.schedule_id, formData);
        setSuccess('Schedule updated successfully!');
      } else {
        await scheduleAPI.create(formData);
        setSuccess('Schedule created successfully!');
      }
      fetchData();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await scheduleAPI.delete(scheduleId);
        setSuccess('Schedule deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Delete failed');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'departed':
        return 'warning';
      case 'arrived':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

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
        <Typography variant="h4">Schedule Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Schedule
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Journey Date</strong></TableCell>
              <TableCell><strong>Route</strong></TableCell>
              <TableCell><strong>Bus</strong></TableCell>
              <TableCell><strong>Departure</strong></TableCell>
              <TableCell><strong>Arrival</strong></TableCell>
              <TableCell><strong>Available Seats</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No schedules found
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => (
                <TableRow key={schedule.schedule_id} hover>
                  <TableCell>{new Date(schedule.journey_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {schedule.origin} → {schedule.destination}
                  </TableCell>
                  <TableCell>{schedule.bus_number}</TableCell>
                  <TableCell>{schedule.departure_time}</TableCell>
                  <TableCell>{schedule.arrival_time}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${schedule.available_seats}/${schedule.total_seats}`}
                      color={schedule.available_seats > 10 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.status}
                      color={getStatusColor(schedule.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(schedule)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(schedule.schedule_id)}
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
        <DialogTitle>{editMode ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
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
              select
              label="Bus"
              name="bus_id"
              value={formData.bus_id}
              onChange={handleChange}
              margin="normal"
              required
            >
              {buses.filter(bus => bus.status === 'active').map((bus) => (
                <MenuItem key={bus.bus_id} value={bus.bus_id}>
                  {bus.bus_number} - {bus.bus_name || 'N/A'} ({bus.bus_type})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Route"
              name="route_id"
              value={formData.route_id}
              onChange={handleChange}
              margin="normal"
              required
            >
              {routes.map((route) => (
                <MenuItem key={route.route_id} value={route.route_id}>
                  {route.origin} → {route.destination} (LKR {route.base_fare})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Journey Date"
              name="journey_date"
              type="date"
              value={formData.journey_date}
              onChange={handleChange}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: new Date().toISOString().split('T')[0]
              }}
            />

            <TextField
              fullWidth
              label="Departure Time"
              name="departure_time"
              type="time"
              value={formData.departure_time}
              onChange={handleChange}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Arrival Time"
              name="arrival_time"
              type="time"
              value={formData.arrival_time}
              onChange={handleChange}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
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

export default Schedules;