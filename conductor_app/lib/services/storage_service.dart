import 'package:shared_preferences/shared_preferences.dart';
import 'package:conductor_app/utils/constants.dart';
import 'dart:convert';

class StorageService {
  // Save token
  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tokenKey, token);
  }

  // Get token
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tokenKey);
  }

  // Save user data
  Future<void> saveUser(String userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userKey, userData);
  }

  // Get user data
  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString(AppConstants.userKey);
    if (userData != null) {
      return jsonDecode(userData) as Map<String, dynamic>;
    }
    return null;
  }

  // Check if logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null;
  }

  // Clear all data
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // Save offline booking data
  Future<void> saveOfflineBooking(Map<String, dynamic> booking) async {
    final prefs = await SharedPreferences.getInstance();
    final offlineData = prefs.getString(AppConstants.offlineDataKey);
    List<dynamic> bookings = [];
    
    if (offlineData != null) {
      bookings = jsonDecode(offlineData) as List<dynamic>;
    }
    
    bookings.add(booking);
    await prefs.setString(AppConstants.offlineDataKey, jsonEncode(bookings));
  }

  // Get offline bookings
  Future<List<dynamic>> getOfflineBookings() async {
    final prefs = await SharedPreferences.getInstance();
    final offlineData = prefs.getString(AppConstants.offlineDataKey);
    if (offlineData != null) {
      return jsonDecode(offlineData) as List<dynamic>;
    }
    return [];
  }

  // Clear offline bookings
  Future<void> clearOfflineBookings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.offlineDataKey);
  }
}