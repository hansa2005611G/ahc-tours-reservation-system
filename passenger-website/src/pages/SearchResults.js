import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { scheduleAPI } from '../services/api';
import './SearchResults.css';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchData = location.state;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!searchData) {
      navigate('/');
      return;
    }
    fetchSchedules();
  }, [searchData, navigate]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await scheduleAPI.getAll({
        origin: searchData.origin,
        destination: searchData.destination,
        journey_date: searchData.journey_date
      });
      setSchedules(response.data.data.schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBus = (schedule) => {
    navigate('/seat-selection', { state: { schedule, searchData } });
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
      <div className="search-results-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Searching for available buses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-page">
      <Navbar />

      <div className="container">
        {/* Search Summary */}
        <div className="search-summary">
          <h2>Available Buses</h2>
          <div className="search-info">
            <span className="search-route">
              {searchData?.origin} → {searchData?.destination}
            </span>
            <span className="search-date">
              📅 {new Date(searchData?.journey_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <p className="results-count">
            {schedules.length} bus{schedules.length !== 1 ? 'es' : ''} found
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Results List */}
        {schedules.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🚌</div>
            <h3>No buses found</h3>
            <p>
              Sorry, there are no available buses for this route on the selected date.
            </p>
            <button onClick={() => navigate('/')} className="back-btn">
              ← Search Again
            </button>
          </div>
        ) : (
          <div className="results-list">
            {schedules.map((schedule) => (
              <div key={schedule.schedule_id} className="bus-card">
                <div className="bus-card-header">
                  <div className="bus-info">
                    <h3 className="bus-name">{schedule.bus_name || 'Bus'}</h3>
                    <p className="bus-number">{schedule.bus_number}</p>
                    <span className={`bus-type ${schedule.bus_type.toLowerCase().replace('-', '')}`}>
                      {schedule.bus_type}
                    </span>
                  </div>
                  <div className="bus-price">
                    <span className="price-label">Fare</span>
                    <span className="price-amount">LKR {schedule.base_fare}</span>
                  </div>
                </div>

                <div className="bus-card-body">
                  <div className="journey-info">
                    <div className="journey-time">
                      <div className="time-block">
                        <span className="time">{formatTime(schedule.departure_time)}</span>
                        <span className="location">{schedule.origin}</span>
                      </div>
                      <div className="journey-line">
                        <div className="duration">
                          {schedule.duration_hours}h
                        </div>
                        <div className="line"></div>
                      </div>
                      <div className="time-block">
                        <span className="time">{formatTime(schedule.arrival_time)}</span>
                        <span className="location">{schedule.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="seats-info">
                    <span className={`seats-badge ${schedule.available_seats < 10 ? 'low' : ''}`}>
                      {schedule.available_seats} seats available
                    </span>
                    <span className="total-seats">
                      out of {schedule.total_seats}
                    </span>
                  </div>
                </div>

                <div className="bus-card-footer">
                  <button
                    onClick={() => handleSelectBus(schedule)}
                    className="select-btn"
                    disabled={schedule.available_seats === 0}
                  >
                    {schedule.available_seats === 0 ? 'Fully Booked' : 'Select Seats'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;