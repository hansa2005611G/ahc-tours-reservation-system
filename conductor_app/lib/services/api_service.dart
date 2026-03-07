import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:conductor_app/utils/constants.dart';
import 'package:conductor_app/services/storage_service.dart';

class ApiService {
  final StorageService _storage = StorageService();

  // Get headers with auth token
  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Test connection
  Future<bool> testConnection() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl.replaceAll('/api', '')}/'),
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Login
  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final isEmail = username.contains('@');
      
      final body = {
        if (isEmail) 'email': username else 'username': username,
        'password': password,
      };

      print('🔐 LOGIN REQUEST: $body');

      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.loginEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      print('Response: ${response.statusCode} - ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        await _storage.saveToken(data['data']['token']);
        await _storage.saveUser(jsonEncode(data['data']['user']));
        return data;
      } else {
        throw Exception(data['message'] ?? 'Login failed');
      }
    } catch (e) {
      print('❌ Login error: $e');
      throw Exception('Login error: $e');
    }
  }

  // Register
  Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
    String? fullName,
    String? phone,
  }) async {
    try {
      final body = {
        'username': username,
        'email': email,
        'password': password,
        'full_name': fullName,
        'phone': phone,
      };

      print('📝 REGISTER REQUEST: $body');

      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.registerEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      print('Response: ${response.statusCode} - ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success']) {
        await _storage.saveToken(data['data']['token']);
        await _storage.saveUser(jsonEncode(data['data']['user']));
        return data;
      } else {
        throw Exception(data['message'] ?? 'Registration failed');
      }
    } catch (e) {
      print('❌ Register error: $e');
      throw Exception('Registration error: $e');
    }
  }

  // Logout
  Future<void> logout() async {
    await _storage.clearAll();
  }

  // Verify QR Code - FIXED VERSION
  Future<Map<String, dynamic>> verifyQRCode(String qrData) async {
    try {
      print('═══════════════════════════════════════');
      print('📱 QR VERIFICATION');
      print('Raw QR Data: $qrData');
      
      // Parse QR code data (it's JSON)
      Map<String, dynamic> qrContent;
      try {
        qrContent = jsonDecode(qrData);
        print('Parsed QR Content: $qrContent');
      } catch (e) {
        print('❌ Failed to parse QR data as JSON: $e');
        throw Exception('Invalid QR code format');
      }

      // Extract booking_reference
      final bookingReference = qrContent['booking_reference'];
      
      if (bookingReference == null) {
        throw Exception('Booking reference not found in QR code');
      }

      print('Booking Reference: $bookingReference');

      // Send to backend with correct field name
      final requestBody = {
        'booking_reference': bookingReference,  // ✅ Correct field name
      };

      print('Request Body: $requestBody');

      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.verifyQREndpoint}'),
        headers: await _getHeaders(),
        body: jsonEncode(requestBody),
      );

      print('Response Status: ${response.statusCode}');
      print('Response Body: ${response.body}');
      print('═══════════════════════════════════════');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Verification failed');
      }
    } catch (e) {
      print('❌ QR verification error: $e');
      print('═══════════════════════════════════════');
      throw Exception('QR verification error: $e');
    }
  }

  // Mark ticket as used
  Future<Map<String, dynamic>> markTicketAsUsed(
    int bookingId,
    bool paymentReceived,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.markUsedEndpoint}'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'booking_id': bookingId,
          'payment_received': paymentReceived,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Failed to mark ticket');
      }
    } catch (e) {
      throw Exception('Mark ticket error: $e');
    }
  }

  // Get today's schedules
  Future<List<dynamic>> getTodaySchedules() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.todaySchedulesEndpoint}'),
        headers: await _getHeaders(),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data['data']['schedules'] as List<dynamic>;
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch schedules');
      }
    } catch (e) {
      throw Exception('Get schedules error: $e');
    }
  }

  // Get schedule bookings
  Future<List<dynamic>> getScheduleBookings(int scheduleId) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.scheduleBookingsEndpoint}/$scheduleId/bookings'),
        headers: await _getHeaders(),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data['data']['bookings'] as List<dynamic>;
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch bookings');
      }
    } catch (e) {
      throw Exception('Get bookings error: $e');
    }
  }
}