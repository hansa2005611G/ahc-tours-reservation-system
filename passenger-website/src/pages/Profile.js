import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { authAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, password

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.updateProfile({
        username: formData.username,
        phone: formData.phone
      });

      setSuccess('Profile updated successfully!');
      
      // Update local storage
      const updatedUser = { ...user, username: formData.username, phone: formData.phone };
      localStorage.setItem('passengerUser', JSON.stringify(updatedUser));
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Note: You'll need to create this endpoint in backend
      await authAPI.updateProfile({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess('Password changed successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="container">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        <div className="profile-container">
          {/* Profile Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <h3>{user.username}</h3>
              <p>{user.email}</p>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Member Since</span>
                <span className="stat-value">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Account Type</span>
                <span className="stat-value">{user.role}</span>
              </div>
            </div>

            <button onClick={handleLogout} className="logout-btn">
              🚪 Logout
            </button>
          </div>

          {/* Profile Content */}
          <div className="profile-content">
            {/* Tabs */}
            <div className="profile-tabs">
              <button
                className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile Information
              </button>
              <button
                className={`tab ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                🔒 Change Password
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    minLength={3}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email cannot be changed</small>
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+94771234567"
                    required
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Updating...' : '💾 Update Profile'}
                </button>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordChange} className="profile-form">
                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  <small>Minimum 8 characters</small>
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Changing...' : '🔒 Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;