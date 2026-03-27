import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Button,
  Divider,
  Alert
} from '@mui/material';
import {
  DirectionsBus,
  ConfirmationNumber,
  AttachMoney,
  TrendingUp,
  AddCircleOutline,
  AltRoute,
  Assessment,
  People
} from '@mui/icons-material';
import { busAPI, bookingAPI } from '../services/api';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card
    sx={{
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 4px 14px rgba(15,23,42,0.06)'
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.2,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const QuickActionButton = ({ label, icon, onClick, color = 'primary' }) => (
  <Button
    variant="contained"
    color={color}
    startIcon={icon}
    onClick={onClick}
    fullWidth
    sx={{
      py: 1.25,
      borderRadius: 2,
      justifyContent: 'flex-start',
      fontWeight: 700,
      boxShadow: '0 6px 14px rgba(0,0,0,0.12)'
    }}
  >
    {label}
  </Button>
);

const Dashboard = () => {
  const navigate = useNavigate();

  const [busStats, setBusStats] = useState(null);
  const [bookingStats, setBookingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching dashboard stats...');

      const [busResponse, bookingResponse] = await Promise.all([
        busAPI.getStats().catch(e => {
          console.error('Bus stats error:', e);
          throw e;
        }),
        bookingAPI.getStats().catch(e => {
          console.error('Booking stats error:', e);
          throw e;
        })
      ]);

      console.log('✅ Bus stats:', busResponse?.data?.data?.stats);
      console.log('✅ Booking stats:', bookingResponse?.data?.data?.stats);

      setBusStats(busResponse?.data?.data?.stats || {});
      setBookingStats(bookingResponse?.data?.data?.stats || {});
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setError('Failed to load dashboard statistics. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={800}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to AHC Tours Admin Panel
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 16px rgba(15,23,42,0.06)'
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shortcuts for frequent admin tasks
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              useFlexGap
              flexWrap="wrap"
            >
              <Box sx={{ flex: '1 1 240px' }}>
                <QuickActionButton
                  label="Add New Bus"
                  icon={<AddCircleOutline />}
                  onClick={() => navigate('/buses')}
                  color="primary"
                />
              </Box>

              <Box sx={{ flex: '1 1 240px' }}>
                <QuickActionButton
                  label="Create Route"
                  icon={<AltRoute />}
                  onClick={() => navigate('/routes')}
                  color="secondary"
                />
              </Box>

              <Box sx={{ flex: '1 1 240px' }}>
                <QuickActionButton
                  label="View Reports"
                  icon={<Assessment />}
                  onClick={() => navigate('/reports')}
                  color="success"
                />
              </Box>

              <Box sx={{ flex: '1 1 240px' }}>
                <QuickActionButton
                  label="Manage Conductors"
                  icon={<People />}
                  onClick={() => navigate('/users')}
                  color="warning"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Top Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Buses"
            value={busStats?.total_buses || 0}
            icon={<DirectionsBus sx={{ color: 'primary.main', fontSize: 36 }} />}
            color="primary"
            subtitle={`${busStats?.active_buses || 0} active`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={bookingStats?.total_bookings || 0}
            icon={<ConfirmationNumber sx={{ color: 'secondary.main', fontSize: 36 }} />}
            color="secondary"
            subtitle={`${bookingStats?.completed_bookings || 0} completed`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Payments"
            value={bookingStats?.pending_bookings || 0}
            icon={<TrendingUp sx={{ color: 'warning.main', fontSize: 36 }} />}
            color="warning"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`LKR ${parseInt(bookingStats?.total_revenue || 0, 10).toLocaleString()}`}
            icon={<AttachMoney sx={{ color: 'success.main', fontSize: 36 }} />}
            color="success"
          />
        </Grid>

        {/* Bus Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Bus Statistics
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Active Buses:</Typography>
                <Typography fontWeight="bold">{busStats?.active_buses || 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>In Maintenance:</Typography>
                <Typography fontWeight="bold">{busStats?.maintenance_buses || 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Inactive:</Typography>
                <Typography fontWeight="bold">{busStats?.inactive_buses || 0}</Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider'
                }}
              >
                <Typography fontWeight="bold">Total Capacity:</Typography>
                <Typography fontWeight="bold" color="primary.main">
                  {busStats?.total_capacity || 0} seats
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Booking Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Booking Statistics
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Completed:</Typography>
                <Typography fontWeight="bold" color="success.main">
                  {bookingStats?.completed_bookings || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Pending:</Typography>
                <Typography fontWeight="bold" color="warning.main">
                  {bookingStats?.pending_bookings || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Failed:</Typography>
                <Typography fontWeight="bold" color="error.main">
                  {bookingStats?.failed_bookings || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Refunded:</Typography>
                <Typography fontWeight="bold">
                  {bookingStats?.refunded_bookings || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;