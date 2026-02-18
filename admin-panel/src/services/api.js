import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Cancellation APIs
export const cancellationAPI = {
  getAll: (params) => api.get('/cancellations', { params }),
  getById: (id) => api.get(`/cancellations/${id}`),
  process: (id, data) => api.put(`/cancellations/${id}`, data),
  getStats: () => api.get('/cancellations/stats/overview')
};

// Bus APIs
export const busAPI = {
  getAll: (params) => api.get('/buses', { params }),
  getById: (id) => api.get(`/buses/${id}`),
  create: (data) => api.post('/buses', data),
  update: (id, data) => api.put(`/buses/${id}`, data),
  delete: (id) => api.delete(`/buses/${id}`),
  getStats: () => api.get('/buses/stats/overview')
};

// Route APIs
export const routeAPI = {
  getAll: (params) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`),
  getPopular: (limit) => api.get(`/routes/popular/list?limit=${limit}`)
};

// Schedule APIs
export const scheduleAPI = {
  getAll: (params) => api.get('/schedules', { params }),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`)
};

// Booking APIs
export const bookingAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  getByReference: (ref) => api.get(`/bookings/reference/${ref}`),
  create: (data) => api.post('/bookings', data),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  getStats: () => api.get('/bookings/stats/overview')
};

// Payment APIs
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  initiate: (bookingId) => api.post('/payments/initiate', { booking_id: bookingId }),
  verifyManually: (bookingId) => api.post(`/payments/verify/${bookingId}`)
};

export default api;