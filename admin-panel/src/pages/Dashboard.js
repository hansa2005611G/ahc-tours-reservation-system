import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  DirectionsBus,
  ConfirmationNumber,
  AttachMoney,
  TrendingUp
} from '@mui/icons-material';
import { busAPI, bookingAPI } from '../services/api';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: 2,
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography color="textSecondary" variant="body2">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
          {subtitle && (
            <Typography variant="caption" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [busStats, setBusStats] = useState(null);
  const [bookingStats, setBookingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [busResponse, bookingResponse] = await Promise.all([
        busAPI.getStats(),
        bookingAPI.getStats()
      ]);

      setBusStats(busResponse.data.data.stats);
      setBookingStats(bookingResponse.data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
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
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to AHC Tours Admin Panel
      </Typography>

      <Grid container spacing={3}>
        {/* Total Buses */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Buses"
            value={busStats?.total_buses || 0}
            icon={<DirectionsBus sx={{ color: 'primary.main', fontSize: 40 }} />}
            color="primary"
            subtitle={`${busStats?.active_buses || 0} active`}
          />
        </Grid>

        {/* Total Bookings */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={bookingStats?.total_bookings || 0}
            icon={<ConfirmationNumber sx={{ color: 'secondary.main', fontSize: 40 }} />}
            color="secondary"
            subtitle={`${bookingStats?.completed_bookings || 0} completed`}
          />
        </Grid>

        {/* Pending Bookings */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Payments"
            value={bookingStats?.pending_bookings || 0}
            icon={<TrendingUp sx={{ color: 'warning.main', fontSize: 40 }} />}
            color="warning"
          />
        </Grid>

        {/* Total Revenue */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`LKR ${parseInt(bookingStats?.total_revenue || 0).toLocaleString()}`}
            icon={<AttachMoney sx={{ color: 'success.main', fontSize: 40 }} />}
            color="success"
          />
        </Grid>

        {/* Bus Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bus Statistics
            </Typography>
            <Box sx={{ mt: 2 }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Booking Statistics
            </Typography>
            <Box sx={{ mt: 2 }}>
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
                <Typography fontWeight="bold">{bookingStats?.refunded_bookings || 0}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;