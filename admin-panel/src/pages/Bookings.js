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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Payment as PaymentIcon,
  QrCode as QrCodeIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { bookingAPI, paymentAPI } from '../services/api';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? { payment_status: filterStatus } : {};
      const response = await bookingAPI.getAll(params);
      setBookings(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBooking(null);
  };

  const handleVerifyPayment = async (bookingId) => {
    if (window.confirm('Verify payment for this booking manually?')) {
      try {
        await paymentAPI.verifyManually(bookingId);
        setSuccess('Payment verified successfully!');
        fetchBookings();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Verification failed');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingAPI.cancel(bookingId);
        setSuccess('Booking cancelled successfully!');
        fetchBookings();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Cancellation failed');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified':
      case 'used':
        return 'success';
      case 'pending':
        return 'warning';
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
      <Typography variant="h4" gutterBottom>
        Booking Management
      </Typography>

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

      {/* Filter Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Filter by Payment Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Typography variant="body2" color="textSecondary">
              Total Bookings: <strong>{bookings.length}</strong>
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Booking Ref</strong></TableCell>
              <TableCell><strong>Passenger</strong></TableCell>
              <TableCell><strong>Journey Date</strong></TableCell>
              <TableCell><strong>Route</strong></TableCell>
              <TableCell><strong>Seat</strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>Payment</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.booking_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {booking.booking_reference}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{booking.passenger_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {booking.passenger_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(booking.journey_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.origin} → {booking.destination}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {booking.bus_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`Seat ${booking.seat_number}`} size="small" />
                  </TableCell>
                  <TableCell>LKR {booking.total_amount}</TableCell>
                  <TableCell>
                    <Chip
                      label={booking.payment_status}
                      color={getPaymentStatusColor(booking.payment_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.verification_status}
                      color={getVerificationStatusColor(booking.verification_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewBooking(booking)}
                      size="small"
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                    {booking.payment_status === 'pending' && (
                      <IconButton
                        color="success"
                        onClick={() => handleVerifyPayment(booking.booking_id)}
                        size="small"
                        title="Verify Payment"
                      >
                        <PaymentIcon />
                      </IconButton>
                    )}
                    {booking.payment_status === 'completed' && booking.verification_status !== 'used' && (
                      <IconButton
                        color="error"
                        onClick={() => handleCancelBooking(booking.booking_id)}
                        size="small"
                        title="Cancel Booking"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Booking Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Booking Details - {selectedBooking?.booking_reference}
        </DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box>
              <Grid container spacing={3}>
                {/* Passenger Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Passenger Information
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Name:</strong> {selectedBooking.passenger_name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email:</strong> {selectedBooking.passenger_email}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Phone:</strong> {selectedBooking.passenger_phone}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Journey Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Journey Information
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Date:</strong>{' '}
                          {new Date(selectedBooking.journey_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Departure:</strong> {selectedBooking.departure_time}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Route:</strong> {selectedBooking.origin} →{' '}
                          {selectedBooking.destination}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Bus:</strong> {selectedBooking.bus_number} -{' '}
                          {selectedBooking.bus_name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Seat Number:</strong>{' '}
                          <Chip label={selectedBooking.seat_number} size="small" color="primary" />
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Payment Information */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Payment Information
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Total Amount:</strong> LKR {selectedBooking.total_amount}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Payment Status:</strong>{' '}
                          <Chip
                            label={selectedBooking.payment_status}
                            color={getPaymentStatusColor(selectedBooking.payment_status)}
                            size="small"
                          />
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Verification Status:</strong>{' '}
                          <Chip
                            label={selectedBooking.verification_status}
                            color={getVerificationStatusColor(selectedBooking.verification_status)}
                            size="small"
                          />
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Booking Date:</strong>{' '}
                          {new Date(selectedBooking.booking_date).toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* QR Code */}
                {selectedBooking.qr_code && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          E-Ticket QR Code
                        </Typography>
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                          <img
                            src={selectedBooking.qr_code}
                            alt="QR Code"
                            style={{ maxWidth: '250px', border: '1px solid #ddd', padding: '10px' }}
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Show this QR code to the conductor
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedBooking?.payment_status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<PaymentIcon />}
              onClick={() => {
                handleVerifyPayment(selectedBooking.booking_id);
                handleCloseDialog();
              }}
            >
              Verify Payment
            </Button>
          )}
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bookings;