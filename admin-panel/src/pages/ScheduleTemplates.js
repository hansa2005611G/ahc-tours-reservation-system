import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  Autorenew as AutoGenerateIcon
} from '@mui/icons-material';
import api from '../services/api';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const ScheduleTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    bus_id: '',
    route_id: '',
    departure_time: '',
    arrival_time: '',
    days_of_week: [],
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchBuses();
    fetchRoutes();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schedule-templates');
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await api.get('/buses');
      setBuses(response.data.data.buses);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data.data.routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        bus_id: template.bus_id,
        route_id: template.route_id,
        departure_time: template.departure_time,
        arrival_time: template.arrival_time,
        days_of_week: template.days_of_week,
        valid_from: template.valid_from,
        valid_until: template.valid_until || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        bus_id: '',
        route_id: '',
        departure_time: '',
        arrival_time: '',
        days_of_week: [],
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: ''
      });
    }
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayValue)
        ? prev.days_of_week.filter(d => d !== dayValue)
        : [...prev.days_of_week, dayValue].sort((a, b) => a - b)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.days_of_week.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }

    try {
      if (editingTemplate) {
        await api.put(`/schedule-templates/${editingTemplate.template_id}`, formData);
        setSuccess('Template updated successfully');
      } else {
        const response = await api.post('/schedule-templates', formData);
        setSuccess(response.data.message);
      }
      
      fetchTemplates();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (error) {
      console.error('Submit error:', error);
      setError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? Associated auto-generated schedules will remain.')) {
      return;
    }

    try {
      await api.delete(`/schedule-templates/${templateId}`);
      setSuccess('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleGenerateSchedules = async (templateId) => {
    const days = parseInt(prompt('Generate schedules for how many days ahead?', '30'));
    
    if (!days || days < 1) return;

    try {
      setGenerating(true);
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      const response = await api.post(`/schedule-templates/${templateId}/generate`, {
        date_range_start: today.toISOString().split('T')[0],
        date_range_end: endDate.toISOString().split('T')[0]
      });

      setSuccess(response.data.message);
    } catch (error) {
      console.error('Generate error:', error);
      setError(error.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoGenerateAll = async () => {
    if (!window.confirm('Auto-generate schedules for ALL active templates for the next 30 days?')) {
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post('/schedule-templates/auto-generate');
      setSuccess(response.data.message);
      fetchTemplates();
    } catch (error) {
      console.error('Auto-generate error:', error);
      setError(error.response?.data?.message || 'Auto-generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const getDaysLabel = (daysArray) => {
    if (!daysArray || daysArray.length === 0) return 'None';
    if (daysArray.length === 7) return 'Every day';
    
    return daysArray
      .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.substring(0, 3))
      .join(', ');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Schedule Templates</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AutoGenerateIcon />}
            onClick={handleAutoGenerateAll}
            disabled={generating}
            sx={{ mr: 2 }}
          >
            {generating ? 'Generating...' : 'Auto-Generate All'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Template
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Template ID</strong></TableCell>
              <TableCell><strong>Bus</strong></TableCell>
              <TableCell><strong>Route</strong></TableCell>
              <TableCell><strong>Timings</strong></TableCell>
              <TableCell><strong>Days</strong></TableCell>
              <TableCell><strong>Valid Period</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No templates found. Create one to auto-generate schedules!
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.template_id}>
                  <TableCell>{template.template_id}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{template.bus_number}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {template.bus_type} ({template.total_seats} seats)
                    </Typography>
                    <br />
                    <Chip 
                      label={template.bus_status} 
                      size="small" 
                      color={template.bus_status === 'active' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{template.route_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {template.origin} → {template.destination}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {template.departure_time} - {template.arrival_time}
                    </Typography>
                  </TableCell>
                  <TableCell>{getDaysLabel(template.days_of_week)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      From: {new Date(template.valid_from).toLocaleDateString()}
                    </Typography>
                    {template.valid_until && (
                      <Typography variant="caption" color="textSecondary">
                        Until: {new Date(template.valid_until).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={template.is_active ? 'Active' : 'Inactive'} 
                      color={template.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleGenerateSchedules(template.template_id)}
                      title="Generate Schedules"
                      disabled={generating || template.bus_status !== 'active'}
                    >
                      <GenerateIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(template)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(template.template_id)}
                      title="Delete"
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Create Schedule Template'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Bus *"
                  name="bus_id"
                  value={formData.bus_id}
                  onChange={handleChange}
                  required
                >
                  {buses.filter(b => b.status === 'active').map((bus) => (
                    <MenuItem key={bus.bus_id} value={bus.bus_id}>
                      {bus.bus_number} - {bus.bus_name} ({bus.bus_type})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Route *"
                  name="route_id"
                  value={formData.route_id}
                  onChange={handleChange}
                  required
                >
                  {routes.map((route) => (
                    <MenuItem key={route.route_id} value={route.route_id}>
                      {route.route_name} ({route.origin} → {route.destination})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Departure Time *"
                  name="departure_time"
                  value={formData.departure_time}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Arrival Time *"
                  name="arrival_time"
                  value={formData.arrival_time}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Days of Week *
                </Typography>
                <FormGroup row>
                  {DAYS_OF_WEEK.map((day) => (
                    <FormControlLabel
                      key={day.value}
                      control={
                        <Checkbox
                          checked={formData.days_of_week.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                        />
                      }
                      label={day.label}
                    />
                  ))}
                </FormGroup>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Valid From *"
                  name="valid_from"
                  value={formData.valid_from}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Valid Until (Optional)"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTemplate ? 'Update' : 'Create & Generate'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ScheduleTemplates;