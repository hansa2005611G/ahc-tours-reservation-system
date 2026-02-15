import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { scheduleAPI } from '../services/api';
import './SeatSelection.css';

const SeatSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { schedule, searchData } = location.state || {};

  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]); // Changed to array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schedule) {
      navigate('/');
      return;
    }
    fetchBookedSeats();
  }, [schedule, navigate]);

  const fetchBookedSeats = async () => {
    try {
      setLoading(true);
      const response = await scheduleAPI.getById(schedule.schedule_id);
      setBookedSeats(response.data.data.booked_seats || []);
    } catch (error) {
      console.error('Error fetching booked seats:', error);
      setError('Failed to load seat availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seatNumber) => {
    if (bookedSeats.includes(seatNumber)) {
      return; // Seat already booked
    }

    // Toggle seat selection
    if (selectedSeats.includes(seatNumber)) {
      // Remove seat
      setSelectedSeats(selectedSeats.filter(seat => seat !== seatNumber));
    } else {
      // Add seat
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login with return path
      navigate('/login', { 
        state: { 
          returnTo: '/seat-selection', 
          bookingData: { schedule, searchData, selectedSeats } 
        } 
      });
      return;
    }

    navigate('/booking', {
      state: {
        schedule,
        searchData,
        selectedSeats
      }
    });
  };

  const generateSeats = () => {
    const seats = [];
    const totalSeats = schedule?.total_seats || 40;
    const seatsPerRow = 4;
    const rows = Math.ceil(totalSeats / seatsPerRow);

    for (let row = 0; row < rows; row++) {
      const rowSeats = [];
      for (let col = 0; col < seatsPerRow; col++) {
        const seatNumber = row * seatsPerRow + col + 1;
        if (seatNumber <= totalSeats) {
          rowSeats.push(seatNumber);
        }
      }
      seats.push(rowSeats);
    }
    return seats;
  };

  const getSeatStatus = (seatNumber) => {
    if (bookedSeats.includes(seatNumber)) return 'booked';
    if (selectedSeats.includes(seatNumber)) return 'selected';
    return 'available';
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate total fare
  const calculateTotalFare = () => {
    return selectedSeats.length * (schedule?.base_fare || 0);
  };

  if (loading) {
    return (
      <div className="seat-selection-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading seat availability...</p>
        </div>
      </div>
    );
  }

  const seats = generateSeats();

  return (
    <div className="seat-selection-page">
      <Navbar />

      <div className="container">
        {/* Journey Details */}
        <div className="journey-summary">
          <h2>Select Your Seats</h2>
          <div className="journey-details">
            <div className="detail-item">
              <span className="label">Route:</span>
              <span className="value">{schedule?.origin} → {schedule?.destination}</span>
            </div>
            <div className="detail-item">
              <span className="label">Date:</span>
              <span className="value">
                {new Date(schedule?.journey_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Departure:</span>
              <span className="value">{formatTime(schedule?.departure_time)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Bus:</span>
              <span className="value">{schedule?.bus_number} - {schedule?.bus_type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Fare per Seat:</span>
              <span className="value price">LKR {schedule?.base_fare}</span>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="seat-selection-container">
          {/* Seat Map */}
          <div className="seat-map-section">
            <div className="bus-layout">
              {/* Driver Section */}
              <div className="driver-section">
                <div className="steering-wheel">🚗</div>
                <span>Driver</span>
              </div>

              {/* Legend */}
              <div className="seat-legend">
                <div className="legend-item">
                  <div className="seat-icon available"></div>
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="seat-icon selected"></div>
                  <span>Selected</span>
                </div>
                <div className="legend-item">
                  <div className="seat-icon booked"></div>
                  <span>Booked</span>
                </div>
              </div>

              {/* Seats Grid */}
              <div className="seats-grid">
                {seats.map((row, rowIndex) => (
                  <div key={rowIndex} className="seat-row">
                    {row.map((seatNumber, colIndex) => (
                      <React.Fragment key={seatNumber}>
                        <button
                          className={`seat ${getSeatStatus(seatNumber)}`}
                          onClick={() => handleSeatClick(seatNumber)}
                          disabled={bookedSeats.includes(seatNumber)}
                        >
                          {seatNumber}
                        </button>
                        {/* Add aisle after 2nd seat */}
                        {colIndex === 1 && <div className="aisle"></div>}
                      </React.Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="booking-summary">
            <h3>Booking Summary</h3>

            <div className="summary-content">
              {selectedSeats.length > 0 ? (
                <>
                  {/* Selected Seats Display */}
                  <div className="selected-seats-display">
                    <div className="seats-count">
                      <span className="count-label">Selected Seats</span>
                      <span className="count-value">{selectedSeats.length}</span>
                    </div>
                    <div className="seats-list">
                      {selectedSeats.sort((a, b) => a - b).map((seat) => (
                        <span key={seat} className="seat-badge">
                          {seat}
                          <button 
                            className="remove-seat"
                            onClick={() => handleSeatClick(seat)}
                            title="Remove seat"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>Fare per Seat</span>
                      <span>LKR {schedule?.base_fare}</span>
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

                  <button onClick={handleProceed} className="proceed-btn">
                    {isAuthenticated ? 'Proceed to Booking' : 'Login to Continue'}
                  </button>
                </>
              ) : (
                <div className="no-seat-selected">
                  <div className="icon">💺</div>
                  <p>Click on seats to select</p>
                  <p className="hint">You can select multiple seats</p>
                </div>
              )}
            </div>

            <div className="info-box">
              <p>
                <strong>Note:</strong> Please arrive at the bus station at least 15 minutes before departure.
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back to Results
        </button>
      </div>
    </div>
  );
};

export default SeatSelection;