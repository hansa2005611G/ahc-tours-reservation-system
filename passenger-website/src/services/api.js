import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('passengerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Schedule APIs
export const scheduleAPI = {
  getAll: (params) => api.get('/schedules', { params }),
  getById: (id) => api.get(`/schedules/${id}`)
};

// Booking APIs
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`)
};

// Payment APIs
export const paymentAPI = {
  initiate: (booking_id) => api.post('/payments/initiate', { booking_id }),
  verifyManually: (bookingId) => api.post(`/payments/verify/${bookingId}`),
  getStatus: (bookingRef) => api.get(`/payments/status/${bookingRef}`)
};

// Cancellation APIs
export const cancellationAPI = {
  request: (data) => api.post('/cancellations', data),
  getMyRequests: () => api.get('/cancellations/my-requests')
};

export default api;