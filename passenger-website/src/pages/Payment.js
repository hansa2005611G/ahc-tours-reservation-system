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
  const [paymentMethod, setPaymentMethod] = useState('payhere'); // payhere | pay_on_bus

  useEffect(() => {
    if (!bookings || bookings.length === 0) {
      navigate('/');
    }
  }, [bookings, navigate]);

  const calculateTotalAmount = () => {
    if (!bookings || bookings.length === 0) return 0;
    return bookings.reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);
  };

  const loadPayHereScript = () =>
    new Promise((resolve, reject) => {
      if (window.payhere) return resolve();

      const script = document.createElement('script');
      script.src = 'https://www.payhere.lk/lib/payhere.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load PayHere SDK'));
      document.body.appendChild(script);
    });

  const waitForPaymentStatus = async (bookingRef, maxAttempts = 10, delayMs = 2000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await paymentAPI.getStatus(bookingRef);
        const status = res?.data?.data?.payment_status;

        if (status === 'completed') return true;
        if (status === 'failed') return false;
      } catch (err) {
        // continue polling
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  };

  const initiatePayHere = async (paymentData, sandboxFlag) => {
    const payment = {
      sandbox: !!sandboxFlag,
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

    window.payhere.onCompleted = async function (orderId) {
      try {
        const paid = await waitForPaymentStatus(orderId);
        if (!paid) {
          setError('Payment callback received, but server confirmation is pending. Please check My Bookings.');
          setLoading(false);
          return;
        }

        navigate('/payment-success', {
          state: { bookings, orderId, paymentMethod: 'payhere' }
        });
      } catch (e) {
        setError('Payment completed, but verification failed. Please contact support.');
        setLoading(false);
      }
    };

    window.payhere.onDismissed = function () {
      setLoading(false);
      setError('Payment was cancelled');
    };

    window.payhere.onError = function (err) {
      console.error('PayHere error:', err);
      setLoading(false);
      setError('Payment failed. Please try again.');
    };

    window.payhere.startPayment(payment);
  };

  const handlePayHerePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await paymentAPI.initiate(bookings[0].booking_id);
      const paymentData = response?.data?.data?.payment;
      const sandboxFlag = response?.data?.data?.sandbox;

      if (!paymentData) {
        throw new Error('Payment data not received from server');
      }

      await loadPayHereScript();
      await initiatePayHere(paymentData, sandboxFlag);
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const handlePayOnBus = async () => {
    try {
      setLoading(true);
      setError('');

      // No gateway call needed.
      // Booking already exists with payment_method=pay_on_bus and payment_status=pending
      navigate('/payment-success', {
        state: {
          bookings,
          paymentMethod: 'pay_on_bus',
          message: 'Booking confirmed. Please pay on the bus.'
        }
      });
    } catch (err) {
      console.error('Pay on bus error:', err);
      setError('Failed to confirm pay on bus booking.');
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (paymentMethod === 'payhere') {
      handlePayHerePayment();
    } else {
      handlePayOnBus();
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

  if (!bookings || bookings.length === 0) return null;

  const totalAmount = calculateTotalAmount();

  return (
    <div className="payment-page">
      <Navbar />
      <div className="container">
        <h2>Payment</h2>

        <div className="payment-container">
          <div className="payment-section">
            <div className="payment-card">
              <h3>Select Payment Method</h3>

              {error && <div className="error-message">{error}</div>}

              <div className="payment-methods">
                {/* Card Payment */}
                <div
                  className={`payment-method ${paymentMethod === 'payhere' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('payhere')}
                >
                  <div className="method-icon">💳</div>
                  <div className="method-info">
                    <h4>Card Payment (PayHere)</h4>
                    <p>Credit/Debit Card, Online Banking</p>
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

                {/* Pay on Bus */}
                <div
                  className={`payment-method ${paymentMethod === 'pay_on_bus' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('pay_on_bus')}
                >
                  <div className="method-icon">🚌</div>
                  <div className="method-info">
                    <h4>Pay on Bus</h4>
                    <p>Pay cash to conductor when boarding</p>
                  </div>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'pay_on_bus'}
                      onChange={() => setPaymentMethod('pay_on_bus')}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceed}
                className="pay-btn"
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : paymentMethod === 'payhere'
                    ? `Pay LKR ${totalAmount.toLocaleString()}`
                    : 'Confirm Booking (Pay on Bus)'}
              </button>

              <div className="secure-notice">
                <span className="lock-icon">🔒</span>
                <span>
                  {paymentMethod === 'payhere'
                    ? 'Your payment is secure and encrypted'
                    : 'Your booking will be confirmed now. Payment on boarding.'}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-card">
              <h3>Booking Summary</h3>

              <div className="journey-info">
                <div className="info-row">
                  <span className="label">Route:</span>
                  <span className="value">{schedule?.origin} → {schedule?.destination}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {schedule?.journey_date
                      ? new Date(schedule.journey_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '-'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Departure:</span>
                  <span className="value">{formatTime(schedule?.departure_time)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Bus:</span>
                  <span className="value">{schedule?.bus_number || '-'}</span>
                </div>
              </div>

              <div className="bookings-list">
                <h4>Tickets ({bookings.length})</h4>
                {bookings.map((booking) => (
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