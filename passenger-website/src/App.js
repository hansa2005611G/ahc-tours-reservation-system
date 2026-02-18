import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchResults from './pages/SearchResults';
import SeatSelection from './pages/SeatSelection';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import BookingSuccess from './pages/BookingSuccess';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/seat-selection" element={<SeatSelection />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;