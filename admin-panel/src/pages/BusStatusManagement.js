import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Build as MaintenanceIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import api from '../services/api';

const BusStatusManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);

  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: ''
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setError('');
      const response = await api.get(`/buses/search?q=${searchTerm}`);
      setSearchResults(response.data.data.buses);
      
      if (response.data.data.buses.length === 0) {
        setError('No buses found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleOpenStatusDialog = (bus) => {
    setSelectedBus(bus);
    setStatusForm({
      status: bus.status,
      reason: bus.status_reason || ''
    });
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBus(null);
  };

  const handleStatusChange = async () => {
    if (!statusForm.status) {
      setError('Please select a status');
      return;
    }

    if ((statusForm.status === 'inactive' || statusForm.status === 'maintenance') && !statusForm.reason.trim()) {
      setError('Reason is required for inactive or maintenance status');
      return;
    }

    try {
      await api.put(`/buses/${selectedBus.bus_id}/status`, statusForm);
      setSuccess(`Bus ${selectedBus.bus_number} status updated to ${statusForm.status}`);
      handleSearch(); // Refresh results
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (error) {
      console.error('Status update error:', error);
      setError(error.response?.data?.message || 'Status update failed');
    }
  };

  const handleViewHistory = async (bus) => {
    try {
      const response = await api.get(`/buses/${bus.bus_id}/status-history`);
      setStatusHistory(response.data.data.history);
      setSelectedBus(bus);
      setOpenHistoryDialog(true);
    } catch (error) {
      console.error('History error:', error);
      setError('Failed to fetch status history');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <ActiveIcon />;
      case 'inactive':
        return <InactiveIcon />;
      case 'maintenance':
        return <MaintenanceIcon />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bus Status Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Search Bus"
              placeholder="Enter bus number, name, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={searching}
              sx={{ height: 56 }}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {searchResults.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Bus Number</strong></TableCell>
                <TableCell><strong>Bus Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Total Seats</strong></TableCell>
                <TableCell><strong>Current Status</strong></TableCell>
                <TableCell><strong>Status Reason</strong></TableCell>
                <TableCell><strong>Last Updated</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.map((bus) => (
                <TableRow key={bus.bus_id}>
                  <TableCell>{bus.bus_number}</TableCell>
                  <TableCell>{bus.bus_name}</TableCell>
                  <TableCell>{bus.bus_type}</TableCell>
                  <TableCell>{bus.total_seats}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(bus.status)}
                      label={bus.status}
                      color={getStatusColor(bus.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {bus.status_reason || '-'}
                  </TableCell>
                  <TableCell>
                    {bus.status_updated_at 
                      ? new Date(bus.status_updated_at).toLocaleString()
                      : '-'
                    }
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenStatusDialog(bus)}
                      sx={{ mr: 1 }}
                    >
                      Change Status
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => handleViewHistory(bus)}
                    >
                      History
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Change Status Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Change Status - {selectedBus?.bus_number}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              select
              label="New Status"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason"
              placeholder="Enter reason for status change..."
              value={statusForm.reason}
              onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
              required={statusForm.status !== 'active'}
            />

            {statusForm.status !== 'active' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Setting bus to {statusForm.status} will cancel all future schedules for this bus.
              </Alert>
            )}

            {statusForm.status === 'active' && selectedBus?.status !== 'active' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Setting bus to active will allow it to be used in schedule templates again.
                Existing templates will automatically generate schedules for this bus.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Status History - {selectedBus?.bus_number}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>From</strong></TableCell>
                  <TableCell><strong>To</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Changed By</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statusHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No history found</TableCell>
                  </TableRow>
                ) : (
                  statusHistory.map((history) => (
                    <TableRow key={history.history_id}>
                      <TableCell>{new Date(history.changed_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={history.previous_status} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={history.new_status} 
                          color={getStatusColor(history.new_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{history.reason || '-'}</TableCell>
                      <TableCell>{history.changed_by_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusStatusManagement;