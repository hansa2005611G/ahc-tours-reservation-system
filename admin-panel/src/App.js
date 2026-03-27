import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buses from './pages/Buses';
import RouteManagement from './pages/Routes';
import Schedules from './pages/Schedules';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import Users from './pages/Users';
import Reports from './pages/Reports';
import DashboardLayout from './layouts/DashboardLayout';
import Cancellations from './pages/Cancellations';
import ScheduleTemplates from './pages/ScheduleTemplates';
import BusStatusManagement from './pages/BusStatusManagement';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    error: { main: '#d32f2f' }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(',')
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } }
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12 } }
    }
  }
});

// Protected Route Component - now inside AppRoutes where AuthProvider exists
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// NEW: Separate component for routes that's INSIDE AuthProvider
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="buses" element={<Buses />} />
        <Route path="routes" element={<RouteManagement />} />
        <Route path="schedule-templates" element={<ScheduleTemplates />} />
        <Route path="bus-status" element={<BusStatusManagement />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="cancellations" element={<Cancellations />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* 404 - Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />  {/* ← Now AppRoutes is INSIDE AuthProvider */}
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;