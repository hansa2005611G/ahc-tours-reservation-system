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
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import api from '../services/api';

const Cancellations = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [filterStatus]);

const fetchRequests = async () => {
  try {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};
    console.log('Fetching cancellations with params:', params); 
    const response = await api.get('/cancellations', { params });
    console.log('Cancellation response:', response.data); 
    setRequests(response.data.data.cancellation_requests);
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    setError('Failed to fetch cancellation requests');
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const response = await api.get('/cancellations/stats/overview');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setAdminRemarks('');
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequest(null);
    setAdminRemarks('');
  };

  const handleProcessRequest = async (status) => {
    if (!adminRemarks && status === 'rejected') {
      setError('Please provide remarks for rejection');
      return;
    }

    const confirmMessage = status === 'approved'
      ? 'Are you sure you want to APPROVE this cancellation? A refund will be processed.'
      : 'Are you sure you want to REJECT this cancellation request?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.put(`/cancellations/${selectedRequest.cancellation_id}`, {
        status,
        admin_remarks: adminRemarks || (status === 'approved' ? 'Approved' : '')
      });

      setSuccess(response.data.message);
      fetchRequests();
      fetchStats();

      setTimeout(() => {
        handleCloseDialog();
      }, 2000);
    } catch (error) {
      console.error('Process request error:', error);
      setError(error.response?.data?.message || 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateRefundPreview = (request) => {
    const journeyDateTime = new Date(`${request.journey_date}T${request.departure_time}`);
    const now = new Date();
    const hoursDifference = (journeyDateTime - now) / (1000 * 60 * 60);

    if (hoursDifference >= 24) {
      return { amount: request.total_amount, percentage: 100 };
    } else if (hoursDifference >= 12) {
      return { amount: request.total_amount * 0.75, percentage: 75 };
    } else if (hoursDifference >= 5) {
      return { amount: request.total_amount * 0.5, percentage: 50 };
    } else {
      return { amount: 0, percentage: 0 };
    }
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cancellation Requests
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

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Requests
                </Typography>
                <Typography variant="h4">{stats.total_requests || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.pending_requests || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Approved
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.approved_requests || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Refunds
                </Typography>
                <Typography variant="h4" color="primary.main">
                  LKR {parseInt(stats.total_refunds || 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Filter by Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Request ID</strong></TableCell>
              <TableCell><strong>Booking Ref</strong></TableCell>
              <TableCell><strong>Passenger</strong></TableCell>
              <TableCell><strong>Route</strong></TableCell>
              <TableCell><strong>Journey Date</strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>Requested On</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No cancellation requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.cancellation_id} hover>
                  <TableCell>{request.cancellation_id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {request.booking_reference}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{request.passenger_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {request.passenger_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.origin} → {request.destination}
                  </TableCell>
                  <TableCell>
                    {new Date(request.journey_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>LKR {request.total_amount}</TableCell>
                  <TableCell>
                    {new Date(request.request_date).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewRequest(request)}
                      size="small"
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                    {request.status === 'pending' && (
                      <>
                        <IconButton
                          color="success"
                          onClick={() => {
                            setSelectedRequest(request);
                            handleProcessRequest('approved');
                          }}
                          size="small"
                          title="Approve"
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleViewRequest(request)}
                          size="small"
                          title="Reject"
                        >
                          <RejectIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View/Process Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Cancellation Request Details - {selectedRequest?.booking_reference}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
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

              <Grid container spacing={2}>
                {/* Booking Details */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Booking Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Booking Reference:</strong> {selectedRequest.booking_reference}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Seat Number:</strong> {selectedRequest.seat_number}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Route:</strong> {selectedRequest.origin} → {selectedRequest.destination}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Bus:</strong> {selectedRequest.bus_number}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Journey Date:</strong>{' '}
                          {new Date(selectedRequest.journey_date).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Departure:</strong> {selectedRequest.departure_time}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Passenger Details */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Passenger Details
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {selectedRequest.passenger_name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedRequest.passenger_email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {selectedRequest.passenger_phone}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Cancellation Details */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Cancellation Request
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Requested By:</strong> {selectedRequest.requester_name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Request Date:</strong>{' '}
                      {new Date(selectedRequest.request_date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Reason:</strong>
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">{selectedRequest.reason}</Typography>
                    </Paper>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      <strong>Status:</strong>{' '}
                      <Chip
                        label={selectedRequest.status}
                        color={getStatusColor(selectedRequest.status)}
                        size="small"
                      />
                    </Typography>
                  </Paper>
                </Grid>

                {/* Refund Calculation */}
                {selectedRequest.status === 'pending' && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.light' }}>
                      <Typography variant="h6" gutterBottom>
                        Refund Calculation
                      </Typography>
                      {(() => {
                        const refund = calculateRefundPreview(selectedRequest);
                        return (
                          <>
                            <Typography variant="body2">
                              <strong>Booking Amount:</strong> LKR {selectedRequest.total_amount}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Refund Percentage:</strong> {refund.percentage}%
                            </Typography>
                            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                              <strong>Refund Amount:</strong> LKR {refund.amount.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                              * Based on time before departure
                            </Typography>
                          </>
                        );
                      })()}
                    </Paper>
                  </Grid>
                )}

                {/* Admin Remarks */}
                {selectedRequest.status === 'pending' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Admin Remarks"
                      multiline
                      rows={3}
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="Enter remarks (optional for approval, required for rejection)"
                    />
                  </Grid>
                )}

                {/* Processed Info */}
                {selectedRequest.status !== 'pending' && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Processing Details
                      </Typography>
                      <Typography variant="body2">
                        <strong>Processed By:</strong> {selectedRequest.processed_by_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Processed Date:</strong>{' '}
                        {selectedRequest.processed_date
                          ? new Date(selectedRequest.processed_date).toLocaleString()
                          : 'N/A'}
                      </Typography>
                      {selectedRequest.admin_remarks && (
                        <>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Admin Remarks:</strong>
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', mt: 0.5 }}>
                            <Typography variant="body2">{selectedRequest.admin_remarks}</Typography>
                          </Paper>
                        </>
                      )}
                      {selectedRequest.status === 'approved' && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Refund Amount:</strong> LKR {selectedRequest.refund_amount || 0}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                onClick={() => handleProcessRequest('approved')}
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={() => handleProcessRequest('rejected')}
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                disabled={processing || !adminRemarks}
              >
                {processing ? 'Processing...' : 'Reject'}
              </Button>
            </>
          )}
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Cancellations;