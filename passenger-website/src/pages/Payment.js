import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { paymentAPI } from '../services/api';
import './Payment.css';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookings, schedule } = location.state || {}; 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('payhere');

  useEffect(() => {
    if (!bookings || bookings.length === 0) {
      navigate('/');
      return;
    }
  }, [bookings, navigate]);

  const calculateTotalAmount = () => {
    if (!bookings || bookings.length === 0) return 0;
    return bookings.reduce((sum, booking) => sum + parseFloat(booking.total_amount), 0);
  };

  const handlePayHerePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Get payment data for the first booking (representing the entire transaction)
      const response = await paymentAPI.initiate(bookings[0].booking_id);
      const paymentData = response.data.data.payment;

      // Load PayHere script if not already loaded
      if (!window.payhere) {
        const script = document.createElement('script');
        script.src = 'https://www.payhere.lk/lib/payhere.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          initiatePayHere(paymentData);
        };
      } else {
        initiatePayHere(paymentData);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setError(error.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const initiatePayHere = (paymentData) => {
    // PayHere payment object
    const payment = {
      sandbox: true, // Set to false in production
      merchant_id: paymentData.merchant_id,
      return_url: paymentData.return_url,
      cancel_url: paymentData.cancel_url,
      notify_url: paymentData.notify_url,
      order_id: paymentData.order_id,
      items: paymentData.items,
      amount: paymentData.amount,
      currency: paymentData.currency,
      hash: paymentData.hash,
      first_name: paymentData.first_name,
      last_name: paymentData.last_name,
      email: paymentData.email,
      phone: paymentData.phone,
      address: paymentData.address,
      city: paymentData.city,
      country: paymentData.country
    };

    // PayHere callbacks
    window.payhere.onCompleted = function (orderId) {
      console.log('Payment completed. Order ID:', orderId);
      // Redirect to success page
      navigate('/payment-success', { state: { bookings, orderId } });
    };

    window.payhere.onDismissed = function () {
      console.log('Payment dismissed');
      setLoading(false);
      setError('Payment was cancelled');
    };

    window.payhere.onError = function (error) {
      console.log('Payment error:', error);
      setLoading(false);
      setError('Payment failed. Please try again.');
    };

    // Start payment
    window.payhere.startPayment(payment);
  };

  const handleManualPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // For testing: Verify payment manually for all bookings
      const verifyPromises = bookings.map(booking =>
        paymentAPI.verifyManually(booking.booking_id)
      );

      await Promise.all(verifyPromises);

      // Navigate to success page
      navigate('/payment-success', { state: { bookings } });
    } catch (error) {
      console.error('Manual payment error:', error);
      setError(error.response?.data?.message || 'Payment verification failed');
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

  if (!bookings || bookings.length === 0) {
    return null;
  }

  const totalAmount = calculateTotalAmount();

  return (
    <div className="payment-page">
      <Navbar />

      <div className="container">
        <h2>Payment</h2>

        <div className="payment-container">
          {/* Payment Methods */}
          <div className="payment-section">
            <div className="payment-card">
              <h3>Select Payment Method</h3>

              {error && <div className="error-message">{error}</div>}

              <div className="payment-methods">
                {/* PayHere Payment */}
                <div
                  className={`payment-method ${paymentMethod === 'payhere' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('payhere')}
                >
                  <div className="method-icon">💳</div>
                  <div className="method-info">
                    <h4>PayHere</h4>
                    <p>Pay with Credit/Debit Card, Online Banking</p>
                  </div>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'payhere'}
                      onChange={() => setPaymentMethod('payhere')}
                    />
                  </div>
                </div>

                {/* Manual Payment (For Testing) */}
                <div
                  className={`payment-method ${paymentMethod === 'manual' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('manual')}
                >
                  <div className="method-icon">🧪</div>
                  <div className="method-info">
                    <h4>Manual Payment (Testing)</h4>
                    <p>Skip payment gateway for testing</p>
                  </div>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'manual'}
                      onChange={() => setPaymentMethod('manual')}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={paymentMethod === 'payhere' ? handlePayHerePayment : handleManualPayment}
                className="pay-btn"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Pay LKR ${totalAmount.toLocaleString()}`}
              </button>

              <div className="secure-notice">
                <span className="lock-icon">🔒</span>
                <span>Your payment is secure and encrypted</span>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="summary-section">
            <div className="summary-card">
              <h3>Booking Summary</h3>

              {/* Journey Details */}
              <div className="journey-info">
                <div className="info-row">
                  <span className="label">Route:</span>
                  <span className="value">{schedule?.origin} → {schedule?.destination}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(schedule?.journey_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Departure:</span>
                  <span className="value">{formatTime(schedule?.departure_time)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Bus:</span>
                  <span className="value">{schedule?.bus_number}</span>
                </div>
              </div>

              {/* Bookings List */}
              <div className="bookings-list">
                <h4>Tickets ({bookings.length})</h4>
                {bookings.map((booking, index) => (
                  <div key={booking.booking_id} className="booking-item">
                    <div className="booking-header">
                      <span className="booking-ref">{booking.booking_reference}</span>
                      <span className="seat-badge">Seat {booking.seat_number}</span>
                    </div>
                    <div className="booking-details">
                      <span>{booking.passenger_name}</span>
                      <span className="amount">LKR {booking.total_amount}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Summary */}
              <div className="price-summary">
                <div className="price-row">
                  <span>Subtotal ({bookings.length} ticket{bookings.length > 1 ? 's' : ''})</span>
                  <span>LKR {totalAmount}</span>
                </div>
                <div className="price-row">
                  <span>Service Charge</span>
                  <span>LKR 0</span>
                </div>
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>LKR {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;