import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    origin: '',
    destination: '',
    journey_date: ''
  });

  const popularRoutes = [
    { from: 'Colombo', to: 'Kandy', price: 500 },
    { from: 'Colombo', to: 'Galle', price: 450 },
    { from: 'Kandy', to: 'Jaffna', price: 1200 },
    { from: 'Colombo', to: 'Trincomalee', price: 800 }
  ];

  const handleChange = (e) => {
    setSearchData({
      ...searchData,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchData.origin && searchData.destination && searchData.journey_date) {
      navigate('/search', { state: searchData });
    }
  };

  const handlePopularRoute = (route) => {
    const today = new Date().toISOString().split('T')[0];
    setSearchData({
      origin: route.from,
      destination: route.to,
      journey_date: today
    });
  };

  return (
    <div className="home-page">
        <Navbar />
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">🚌 AHC Tours</h1>
            <p className="hero-subtitle">Your Journey, Our Priority</p>
            <p className="hero-description">
              Book your bus tickets online - Easy, Fast & Reliable
            </p>

            {/* Search Form */}
            <div className="search-card">
              <h2>Find Your Bus</h2>
              <form onSubmit={handleSearch} className="search-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>From</label>
                    <input
                      type="text"
                      name="origin"
                      value={searchData.origin}
                      onChange={handleChange}
                      placeholder="Origin City"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>To</label>
                    <input
                      type="text"
                      name="destination"
                      value={searchData.destination}
                      onChange={handleChange}
                      placeholder="Destination City"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Journey Date</label>
                    <input
                      type="date"
                      name="journey_date"
                      value={searchData.journey_date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <button type="submit" className="search-btn">
                    Search Buses
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="popular-routes">
        <div className="container">
          <h2>Popular Routes</h2>
          <div className="routes-grid">
            {popularRoutes.map((route, index) => (
              <div
                key={index}
                className="route-card"
                onClick={() => handlePopularRoute(route)}
              >
                <div className="route-info">
                  <h3>{route.from}</h3>
                  <span className="route-arrow">→</span>
                  <h3>{route.to}</h3>
                </div>
                <p className="route-price">Starting from LKR {route.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2>Why Choose AHC Tours?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎫</div>
              <h3>Easy Booking</h3>
              <p>Book your tickets in just a few clicks</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Secure Payment</h3>
              <p>100% secure payment gateway</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>E-Ticket</h3>
              <p>Get instant e-ticket with QR code</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3>24/7 Support</h3>
              <p>Customer support anytime, anywhere</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;