import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { bookingAPI } from '../services/api';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    bookings: initialBookings,
    orderId,
    paymentMethod, // 'payhere' | 'pay_on_bus'
    message
  } = location.state || {};

  const [bookings, setBookings] = useState(initialBookings || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialBookings || initialBookings.length === 0) {
      navigate('/');
      return;
    }

    fetchUpdatedBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUpdatedBookings = async () => {
    try {
      setLoading(true);
      const updatedBookings = await Promise.all(
        initialBookings.map((booking) => bookingAPI.getById(booking.booking_id))
      );
      setBookings(updatedBookings.map((res) => res.data.data.booking));
    } catch (error) {
      console.error('Error fetching updated bookings:', error);
      // fallback: keep initial bookings
      setBookings(initialBookings || []);
    } finally {
      setLoading(false);
    }
  };

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
    if (!time) return '-';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="payment-success-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Preparing your booking details...</p>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) return null;

  const isPayOnBus = paymentMethod === 'pay_on_bus';
  const headerTitle = isPayOnBus ? 'Booking Confirmed!' : 'Payment Successful!';
  const headerMessage =
    message ||
    (isPayOnBus
      ? 'Your booking is confirmed. Please pay the fare to the conductor when boarding.'
      : 'Your booking has been confirmed. E-tickets have been sent to your email.');

  const totalAmount = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

  return (
    <div className="payment-success-page">
      <Navbar />

      <div className="container">
        {/* Header */}
        <div className="success-header">
          <div className="success-icon">✓</div>
          <h1>{headerTitle}</h1>
          <p>{headerMessage}</p>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons no-print">
          <button onClick={handlePrint} className="action-btn print-btn">
            🖨️ Print All Tickets
          </button>
          <Link to="/" className="action-btn home-btn">
            🏠 Back to Home
          </Link>
        </div>

        {/* Tickets */}
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
                {/* Journey */}
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
                        {formatDate(booking.journey_date || booking.schedule_journey_date)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Bus Number</span>
                      <span className="info-value">{booking.bus_number || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Bus Type</span>
                      <span className="info-value">{booking.bus_type || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Seat Number</span>
                      <span className="info-value seat">{booking.seat_number}</span>
                    </div>
                  </div>
                </div>

                {/* Passenger */}
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
                      <span className="info-label">Fare</span>
                      <span className="info-value price">LKR {booking.total_amount}</span>
                    </div>
                  </div>
                </div>

                {/* QR */}
                {booking.qr_code ? (
                  <div className="qr-section">
                    <h3>Boarding Pass</h3>
                    <div className="qr-container">
                      <img src={booking.qr_code} alt="Boarding QR Code" className="qr-code" />
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
                ) : (
                  <div className="qr-section">
                    <h3>Boarding Pass</h3>
                    <p className="qr-instruction">
                      QR is being prepared. Please check “My Bookings” in a moment.
                    </p>
                  </div>
                )}
              </div>

              <div className="ticket-footer">
                <div className="important-info">
                  <h4>Important Information</h4>
                  <ul>
                    <li>Please arrive at the bus station 15 minutes before departure</li>
                    <li>Carry a valid photo ID for verification</li>
                    <li>This ticket is non-transferable</li>
                    <li>
                      Payment Method: <strong>{booking.payment_method || (isPayOnBus ? 'pay_on_bus' : 'card_payhere')}</strong>
                    </li>
                    <li>
                      Booking Status: <strong>{booking.payment_status}</strong>
                    </li>
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
              <span>{isPayOnBus ? 'Total Payable on Bus:' : 'Total Amount:'}</span>
              <span className="total-amount">LKR {totalAmount.toLocaleString()}</span>
            </div>
            {orderId && (
              <div className="summary-row">
                <span>Transaction ID:</span>
                <span className="transaction-id">{orderId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;