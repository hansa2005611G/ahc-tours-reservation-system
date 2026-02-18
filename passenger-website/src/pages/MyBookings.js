import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, cancellationAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './MyBookings.css';

const MyBookings = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getAll();
      setBookings(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [isAuthenticated, navigate, fetchBookings]);

  const handleCancelBooking = async (booking) => {
  // Check time restriction
  const journeyDateTime = new Date(`${booking.journey_date}T${booking.departure_time}`);
  const now = new Date();
  const hoursDifference = (journeyDateTime - now) / (1000 * 60 * 60);

  if (hoursDifference < 5) {
    alert('Cannot cancel booking. Cancellation must be requested at least 5 hours before departure.');
    return;
  }

  const reason = prompt('Please provide a reason for cancellation:');
  if (!reason || reason.trim() === '') {
    alert('Cancellation reason is required.');
    return;
  }

  if (!window.confirm('Are you sure you want to submit a cancellation request?')) {
    return;
  }

  try {
    setCancellingId(booking.booking_id);
    
    const response = await cancellationAPI.request({
      booking_id: booking.booking_id,
      reason: reason.trim()
    });

    console.log('Cancellation response:', response.data);
    
    alert('Cancellation request submitted successfully! You will be notified once the admin reviews your request.');
    
    // Refresh bookings list
    await fetchBookings();
  } catch (error) {
    console.error('Cancel booking error:', error);
    const errorMessage = error.response?.data?.message || 'Failed to submit cancellation request';
    alert(errorMessage);
  } finally {
    setCancellingId(null);
  }
};

  const handleViewTicket = (booking) => {
    navigate('/payment-success', { 
      state: { 
        bookings: [booking],
        orderId: booking.booking_reference 
      } 
    });
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filterBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.filter(booking => {
      const journeyDate = new Date(booking.journey_date);
      journeyDate.setHours(0, 0, 0, 0);

      if (filter === 'upcoming') {
        return journeyDate >= today && booking.payment_status === 'completed';
      } else if (filter === 'past') {
        return journeyDate < today || booking.verification_status === 'used';
      }
      return true; // all
    });
  };

  const getStatusBadge = (booking) => {
  if (booking.payment_status === 'refunded') {
    return <span className="status-badge cancelled">Cancelled</span>;
  }
  if (booking.payment_status === 'pay_on_bus') {
    return <span className="status-badge pay-on-bus">Pay on Bus</span>;
  }
  if (booking.payment_status === 'pending') {
    return <span className="status-badge pending">Payment Pending</span>;
  }
  if (booking.payment_status === 'completed') {
    return <span className="status-badge completed">Paid</span>;
  }
  if (booking.verification_status === 'used') {
    return <span className="status-badge completed">Completed</span>;
  }

  const journeyDate = new Date(booking.journey_date);
  const today = new Date();
  journeyDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (journeyDate >= today) {
    return <span className="status-badge confirmed">Confirmed</span>;
  }
  return <span className="status-badge expired">Expired</span>;
};
  const canCancelBooking = (booking) => {
    const journeyDate = new Date(booking.journey_date);
    const today = new Date();
    journeyDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return (
      booking.payment_status === 'completed' &&
      booking.verification_status !== 'used' &&
      journeyDate >= today
    );
  };

  if (loading) {
    return (
      <div className="my-bookings-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const filteredBookings = filterBookings();

  return (
    <div className="my-bookings-page">
      <Navbar />

      <div className="container">
        <div className="page-header">
          <h1>My Bookings</h1>
          <p>View and manage your bus ticket bookings</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`filter-tab ${filter === 'past' ? 'active' : ''}`}
            onClick={() => setFilter('past')}
          >
            Past
          </button>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">🎫</div>
            <h3>No bookings found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings found.`}
            </p>
            <button onClick={() => navigate('/')} className="book-now-btn">
              Book a Ticket
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map((booking) => (
              <div key={booking.booking_id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-ref-section">
                    <span className="booking-ref">{booking.booking_reference}</span>
                    {getStatusBadge(booking)}
                  </div>
                  <div className="booking-date">
                    Booked on {new Date(booking.booking_date).toLocaleDateString()}
                  </div>
                </div>

                <div className="booking-body">
                  <div className="journey-details">
                    <div className="route-section">
                      <div className="city-block">
                        <span className="city">{booking.origin}</span>
                        <span className="time">{formatTime(booking.departure_time)}</span>
                      </div>
                      <div className="route-icon">→</div>
                      <div className="city-block">
                        <span className="city">{booking.destination}</span>
                        <span className="time">{formatTime(booking.arrival_time)}</span>
                      </div>
                    </div>

                    <div className="booking-info-grid">
                      <div className="info-item">
                        <span className="label">Journey Date</span>
                        <span className="value">
                          {new Date(booking.journey_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Bus</span>
                        <span className="value">{booking.bus_number}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Seat</span>
                        <span className="value seat-badge">{booking.seat_number}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Fare</span>
                        <span className="value price">LKR {booking.total_amount}</span>
                      </div>
                    </div>

                    <div className="passenger-info">
                      <span className="label">Passenger:</span>
                      <span className="value">{booking.passenger_name}</span>
                    </div>
                  </div>

                  {booking.qr_code && (
                    <div className="qr-preview">
                      <img src={booking.qr_code} alt="QR Code" className="qr-small" />
                    </div>
                  )}
                </div>

                <div className="booking-actions">
                  {booking.payment_status === 'completed' && (
                    <button
                      onClick={() => handleViewTicket(booking)}
                      className="action-btn view-btn"
                    >
                      📱 View E-Ticket
                    </button>
                  )}

                  {canCancelBooking(booking) && (
                    <button
                      onClick={() => handleCancelBooking(booking.booking_id)}
                      className="action-btn cancel-btn"
                      disabled={cancellingId === booking.booking_id}
                    >
                      {cancellingId === booking.booking_id ? 'Cancelling...' : '❌ Cancel Booking'}
                    </button>
                  )}

                  {booking.payment_status === 'pending' && (
                    <button
                      onClick={() => navigate('/payment', { state: { bookings: [booking] } })}
                      className="action-btn pay-btn"
                    >
                      💳 Complete Payment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;