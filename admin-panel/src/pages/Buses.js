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
  Search as SearchIcon
} from '@mui/icons-material';
import { busAPI } from '../services/api';

const Buses = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    bus_number: '',
    bus_name: '',
    total_seats: '',
    bus_type: 'Non-AC',
    status: 'active'
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await busAPI.getAll();
      setBuses(response.data.data.buses);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setError('Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (bus = null) => {
    if (bus) {
      setEditMode(true);
      setSelectedBus(bus);
      setFormData({
        bus_number: bus.bus_number,
        bus_name: bus.bus_name || '',
        total_seats: bus.total_seats,
        bus_type: bus.bus_type,
        status: bus.status
      });
    } else {
      setEditMode(false);
      setSelectedBus(null);
      setFormData({
        bus_number: '',
        bus_name: '',
        total_seats: '',
        bus_type: 'Non-AC',
        status: 'active'
      });
    }
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedBus(null);
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
        await busAPI.update(selectedBus.bus_id, formData);
        setSuccess('Bus updated successfully!');
      } else {
        await busAPI.create(formData);
        setSuccess('Bus created successfully!');
      }
      fetchBuses();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (busId) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        await busAPI.delete(busId);
        setSuccess('Bus deleted successfully!');
        fetchBuses();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Delete failed');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredBuses = buses.filter(
    (bus) =>
      bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bus.bus_name && bus.bus_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Typography variant="h4">Bus Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Bus
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
          placeholder="Search by bus number or name..."
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
              <TableCell><strong>Bus Number</strong></TableCell>
              <TableCell><strong>Bus Name</strong></TableCell>
              <TableCell><strong>Total Seats</strong></TableCell>
              <TableCell><strong>Bus Type</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No buses found
                </TableCell>
              </TableRow>
            ) : (
              filteredBuses.map((bus) => (
                <TableRow key={bus.bus_id} hover>
                  <TableCell>{bus.bus_number}</TableCell>
                  <TableCell>{bus.bus_name || '-'}</TableCell>
                  <TableCell>{bus.total_seats}</TableCell>
                  <TableCell>
                    <Chip label={bus.bus_type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={bus.status}
                      color={getStatusColor(bus.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(bus)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(bus.bus_id)}
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
        <DialogTitle>{editMode ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
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
              label="Bus Number"
              name="bus_number"
              value={formData.bus_number}
              onChange={handleChange}
              margin="normal"
              required
              placeholder="e.g., NC-1234"
            />

            <TextField
              fullWidth
              label="Bus Name"
              name="bus_name"
              value={formData.bus_name}
              onChange={handleChange}
              margin="normal"
              placeholder="e.g., Colombo Express"
            />

            <TextField
              fullWidth
              label="Total Seats"
              name="total_seats"
              type="number"
              value={formData.total_seats}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ min: 10, max: 60 }}
            />

            <TextField
              fullWidth
              select
              label="Bus Type"
              name="bus_type"
              value={formData.bus_type}
              onChange={handleChange}
              margin="normal"
              required
            >
              <MenuItem value="AC">AC</MenuItem>
              <MenuItem value="Non-AC">Non-AC</MenuItem>
              <MenuItem value="Semi-Luxury">Semi-Luxury</MenuItem>
              <MenuItem value="Luxury">Luxury</MenuItem>
            </TextField>

            <TextField
              fullWidth
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              margin="normal"
              required
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
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

export default Buses;