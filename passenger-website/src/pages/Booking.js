import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { bookingAPI } from '../services/api';
import './Booking.css';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schedule, selectedSeats } = location.state || {};

  const [formData, setFormData] = useState({
    passenger_name: user?.username || '',
    passenger_email: user?.email || '',
    passenger_phone: user?.phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create bookings for all selected seats
      const bookingPromises = selectedSeats.map(seatNumber => {
        return bookingAPI.create({
          schedule_id: schedule.schedule_id,
          seat_number: seatNumber,
          passenger_name: formData.passenger_name,
          passenger_email: formData.passenger_email,
          passenger_phone: formData.passenger_phone
        });
      });

      const responses = await Promise.all(bookingPromises);
      const bookings = responses.map(res => res.data.data.booking);

      // Navigate to payment with all bookings
      navigate('/payment', { state: { bookings, schedule, selectedSeats } });
    } catch (error) {
      console.error('Booking error:', error);
      setError(error.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateTotalFare = () => {
    return selectedSeats.length * (schedule?.base_fare || 0);
  };

  if (!schedule || !selectedSeats || selectedSeats.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <div className="booking-page">
      <Navbar />

      <div className="container">
        <h2>Confirm Your Booking</h2>

        <div className="booking-container">
          {/* Booking Form */}
          <div className="booking-form-section">
            <div className="form-card">
              <h3>Passenger Details</h3>

              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="passenger_name"
                    value={formData.passenger_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="passenger_email"
                    value={formData.passenger_email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    required
                  />
                  <small>E-ticket will be sent to this email</small>
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="passenger_phone"
                    value={formData.passenger_phone}
                    onChange={handleChange}
                    placeholder="+94771234567"
                    required
                  />
                  <small>For booking confirmation</small>
                </div>

                <div className="terms-checkbox">
                  <input type="checkbox" id="terms" required />
                  <label htmlFor="terms">
                    I agree to the terms and conditions and cancellation policy
                  </label>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="booking-summary-section">
            <div className="summary-card">
              <h3>Journey Summary</h3>

              <div className="journey-route">
                <div className="route-point">
                  <div className="point-dot"></div>
                  <div className="point-info">
                    <span className="location">{schedule.origin}</span>
                    <span className="time">{formatTime(schedule.departure_time)}</span>
                  </div>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                  <div className="point-dot"></div>
                  <div className="point-info">
                    <span className="location">{schedule.destination}</span>
                    <span className="time">{formatTime(schedule.arrival_time)}</span>
                  </div>
                </div>
              </div>

              <div className="summary-details">
                <div className="detail-row">
                  <span>Journey Date</span>
                  <span className="value">
                    {new Date(schedule.journey_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Bus Number</span>
                  <span className="value">{schedule.bus_number}</span>
                </div>
                <div className="detail-row">
                  <span>Bus Type</span>
                  <span className="value">{schedule.bus_type}</span>
                </div>
                <div className="detail-row">
                  <span>Seat Number{selectedSeats.length > 1 ? 's' : ''}</span>
                  <span className="value seat">
                    {selectedSeats.sort((a, b) => a - b).join(', ')}
                  </span>
                </div>
              </div>

              <div className="price-summary">
                <div className="price-row">
                  <span>Base Fare per Seat</span>
                  <span>LKR {schedule.base_fare}</span>
                </div>
                <div className="price-row">
                  <span>Number of Seats</span>
                  <span>× {selectedSeats.length}</span>
                </div>
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>LKR {calculateTotalFare()}</span>
                </div>
                <div className="price-row">
                  <span>Service Charge</span>
                  <span>LKR 0</span>
                </div>
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>LKR {calculateTotalFare()}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h4>Important Information</h4>
              <ul>
                <li>Please arrive 15 minutes before departure</li>
                <li>Carry a valid photo ID for verification</li>
                <li>E-ticket will be sent via email after payment</li>
                <li>Show QR code to conductor when boarding</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;