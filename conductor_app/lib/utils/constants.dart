class AppConstants {
  // API Configuration
  static const String baseUrl = 'http://192.168.8.110:5001/api'; // Change to your IP
  
  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String verifyQREndpoint = '/qr/verify';
  static const String markUsedEndpoint = '/qr/mark-used';
  static const String todaySchedulesEndpoint = '/qr/today-schedules';
  static const String scheduleBookingsEndpoint = '/qr/schedule';
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String offlineDataKey = 'offline_bookings';
  
  // App Info
  static const String appName = 'AHC Tours Conductor';
  static const String version = '1.0.0';
}