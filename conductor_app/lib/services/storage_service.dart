import 'package:shared_preferences/shared_preferences.dart';
import 'package:conductor_app/utils/constants.dart';
import 'dart:convert';

class StorageService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _offlineDataKey = 'offline_bookings';
  
  // Save token
  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tokenKey, token);
    print('✅ Token saved: ${token.substring(0, 20)}...');
  }

  // Get token
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    if (token != null) {
      print('📥 Token retrieved: ${token.substring(0, 20)}...');
    } else {
      print('📥 No token found');
    }
    return token;
  }

  // Save user data
  Future<void> saveUser(String userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userKey, userData);
    print('✅ User data saved: $userData');
  }

  // Get user (returns Map)
  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(AppConstants.userKey);
    if (userJson != null) {
      print('📥 User data retrieved: $userJson');
      try {
        return jsonDecode(userJson) as Map<String, dynamic>;
      } catch (e) {
        print('❌ Error decoding user data: $e');
        return null;
      }
    }
    print('📥 No user data found');
    return null;
  }

  // Check if logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    final hasToken = token != null;
    print('🔍 Is logged in: $hasToken');
    return hasToken;
  }

  // Clear all data
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove(AppConstants.userKey);
    // Don't clear offline bookings on logout
    print('🗑️ Auth data cleared (token and user)');
  }

  // Clear everything including offline data
  Future<void> clearAllData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    print('🗑️ All data cleared');
  }

  // Save offline booking data
  Future<void> saveOfflineBooking(Map<String, dynamic> booking) async {
    final prefs = await SharedPreferences.getInstance();
    final offlineData = prefs.getString(AppConstants.offlineDataKey);
    List<dynamic> bookings = [];
    
    if (offlineData != null) {
      try {
        bookings = jsonDecode(offlineData) as List<dynamic>;
      } catch (e) {
        print('❌ Error decoding offline bookings: $e');
        bookings = [];
      }
    }
    
    bookings.add(booking);
    await prefs.setString(AppConstants.offlineDataKey, jsonEncode(bookings));
    print('✅ Offline booking saved. Total: ${bookings.length}');
  }

  // Get offline bookings
  Future<List<dynamic>> getOfflineBookings() async {
    final prefs = await SharedPreferences.getInstance();
    final offlineData = prefs.getString(AppConstants.offlineDataKey);
    if (offlineData != null) {
      try {
        final bookings = jsonDecode(offlineData) as List<dynamic>;
        print('📥 Retrieved ${bookings.length} offline bookings');
        return bookings;
      } catch (e) {
        print('❌ Error decoding offline bookings: $e');
        return [];
      }
    }
    print('📥 No offline bookings found');
    return [];
  }

  // Clear offline bookings
  Future<void> clearOfflineBookings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.offlineDataKey);
    print('🗑️ Offline bookings cleared');
  }

  // Get all stored keys (for debugging)
  Future<Set<String>> getAllKeys() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getKeys();
  }

  // Debug: Print all stored data
  Future<void> debugPrintAll() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys();
    
    print('═══════════════════════════════════════');
    print('📦 STORAGE DEBUG - All Stored Data');
    print('═══════════════════════════════════════');
    
    for (final key in keys) {
      final value = prefs.get(key);
      if (value is String && value.length > 50) {
        print('$key: ${value.substring(0, 50)}...');
      } else {
        print('$key: $value');
      }
    }
    
    print('═══════════════════════════════════════');
  }
}