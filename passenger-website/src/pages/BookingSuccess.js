import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { bookingAPI } from '../services/api';
import './BookingSuccess.css';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookings: initialBookings } = location.state || {};

  const [bookings, setBookings] = useState(initialBookings || []);
  const [loading, setLoading] = useState(true);

  const fetchUpdatedBookings = useCallback(async () => {
    try {
      setLoading(true);
      const updatedBookings = await Promise.all(
        initialBookings.map(booking =>
          bookingAPI.getById(booking.booking_id)
        )
      );
      setBookings(updatedBookings.map(res => res.data.data.booking));
    } catch (error) {
      console.error('Error fetching updated bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [initialBookings]);

  useEffect(() => {
    if (!initialBookings || initialBookings.length === 0) {
      navigate('/');
      return;
    }

    fetchUpdatedBookings();
  }, [initialBookings, navigate, fetchUpdatedBookings]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = (booking) => {
    if (booking.qr_code) {
      const link = document.createElement('a');
      link.href = booking.qr_code;
      link.download = `ticket-${booking.booking_reference}.png`;
      link.click();
    }
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="booking-success-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating your e-tickets...</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return null;
  }

  return (
    <div className="booking-success-page">
      <Navbar />

      <div className="container">
        {/* Success Header */}
        <div className="success-header">
          <div className="success-icon">✓</div>
          <h1>Booking Confirmed!</h1>
          <p>Your seats have been reserved. Pay when you board the bus.</p>
          <div className="pay-on-bus-notice">
            <h3>💰 Pay on Bus</h3>
            <p>Show your QR code to the conductor and pay the fare when boarding.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons no-print">
          <button onClick={handlePrint} className="action-btn print-btn">
            🖨️ Print All Tickets
          </button>
          <Link to="/my-bookings" className="action-btn bookings-btn">
            🎫 My Bookings
          </Link>
          <Link to="/" className="action-btn home-btn">
            🏠 Back to Home
          </Link>
        </div>

        {/* E-Tickets */}
        <div className="tickets-container">
          {bookings.map((booking) => (
            <div key={booking.booking_id} className="ticket-card">
              <div className="ticket-header">
                <div className="ticket-logo">
                  <h2>🚌 AHC Tours</h2>
                  <p>E-Ticket</p>
                </div>
                <div className="ticket-ref">
                  <span className="ref-label">Booking Reference</span>
                  <span className="ref-value">{booking.booking_reference}</span>
                </div>
              </div>

              <div className="ticket-body">
                {/* Journey Details */}
                <div className="journey-section">
                  <h3>Journey Details</h3>
                  <div className="journey-route">
                    <div className="route-city">
                      <span className="city-name">{booking.origin}</span>
                      <span className="city-time">{formatTime(booking.departure_time)}</span>
                    </div>
                    <div className="route-arrow">→</div>
                    <div className="route-city">
                      <span className="city-name">{booking.destination}</span>
                      <span className="city-time">{formatTime(booking.arrival_time)}</span>
                    </div>
                  </div>
                  <div className="journey-info-grid">
                    <div className="info-item">
                      <span className="info-label">Date</span>
                      <span className="info-value">
                        {new Date(booking.journey_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Bus Number</span>
                      <span className="info-value">{booking.bus_number}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Bus Type</span>
                      <span className="info-value">{booking.bus_type}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Seat Number</span>
                      <span className="info-value seat">{booking.seat_number}</span>
                    </div>
                  </div>
                </div>

                {/* Passenger Details */}
                <div className="passenger-section">
                  <h3>Passenger Details</h3>
                  <div className="passenger-info">
                    <div className="info-item">
                      <span className="info-label">Name</span>
                      <span className="info-value">{booking.passenger_name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{booking.passenger_email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Phone</span>
                      <span className="info-value">{booking.passenger_phone}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Fare (Pay on Bus)</span>
                      <span className="info-value price">LKR {booking.total_amount}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                {booking.qr_code && (
                  <div className="qr-section">
                    <h3>Boarding Pass</h3>
                    <div className="qr-container">
                      <img
                        src={booking.qr_code}
                        alt="Boarding QR Code"
                        className="qr-code"
                      />
                      <p className="qr-instruction">
                        Show this QR code to the conductor when boarding
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(booking)}
                      className="download-btn no-print"
                    >
                      💾 Download QR Code
                    </button>
                  </div>
                )}
              </div>

              <div className="ticket-footer">
                <div className="important-info">
                  <h4>Important Information</h4>
                  <ul>
                    <li>Please arrive at the bus station 15 minutes before departure</li>
                    <li>Carry a valid photo ID for verification</li>
                    <li><strong>Pay LKR {booking.total_amount} to the conductor when boarding</strong></li>
                    <li>Show this QR code for verification</li>
                    <li>Payment Status: <strong className="pay-on-bus-badge">Pay on Bus</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="booking-summary no-print">
          <h3>Booking Summary</h3>
          <div className="summary-content">
            <div className="summary-row">
              <span>Total Tickets:</span>
              <span>{bookings.length}</span>
            </div>
            <div className="summary-row">
              <span>Total Amount (Pay on Bus):</span>
              <span className="total-amount">
                LKR {bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0).toLocaleString()}
              </span>
            </div>
            <div className="summary-row">
              <span>Payment Method:</span>
              <span className="payment-method">💰 Pay on Bus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;