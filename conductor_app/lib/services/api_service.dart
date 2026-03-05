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

  // Login
Future<Map<String, dynamic>> login(String username, String password) async {
  try {
    // Determine if input is email or username
    final isEmail = username.contains('@');
    
    final body = {
      if (isEmail) 'email': username else 'username': username,
      'password': password,
    };

    final url = '${AppConstants.baseUrl}${AppConstants.loginEndpoint}';
    
    print('═══════════════════════════════════════');
    print('🔐 LOGIN REQUEST DEBUG');
    print('═══════════════════════════════════════');
    print('URL: $url');
    print('Body: $body');
    print('═══════════════════════════════════════');

    final response = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(
      const Duration(seconds: 10),
      onTimeout: () {
        throw Exception('Connection timeout - Backend not reachable');
      },
    );

    print('Response Status: ${response.statusCode}');
    print('Response Body: ${response.body}');
    print('═══════════════════════════════════════');

    final data = jsonDecode(response.body);

    if (response.statusCode == 200 && data['success']) {
      // Save token
      await _storage.saveToken(data['data']['token']);
      
      // Save user data as JSON string
      final userData = data['data']['user'];
      await _storage.saveUser(jsonEncode(userData));
      
      print('✅ Login successful - Token and user saved');
      return data;
    } else {
      throw Exception(data['message'] ?? 'Login failed');
    }
  } catch (e) {
    print('❌ LOGIN ERROR: $e');
    print('═══════════════════════════════════════');
    rethrow;
  }
}

// Register Conductor
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

    final url = '${AppConstants.baseUrl}${AppConstants.registerEndpoint}';
    
    print('═══════════════════════════════════════');
    print('📝 REGISTER REQUEST DEBUG');
    print('═══════════════════════════════════════');
    print('URL: $url');
    print('Body: $body');
    print('═══════════════════════════════════════');

    final response = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(
      const Duration(seconds: 10),
      onTimeout: () {
        throw Exception('Connection timeout - Backend not reachable');
      },
    );

    print('Response Status: ${response.statusCode}');
    print('Response Body: ${response.body}');
    print('═══════════════════════════════════════');

    final data = jsonDecode(response.body);

    if (response.statusCode == 201 && data['success']) {
      // Save token
      await _storage.saveToken(data['data']['token']);
      
      // Save user data as JSON string
      final userData = data['data']['user'];
      await _storage.saveUser(jsonEncode(userData));
      
      print('✅ Registration successful - Token and user saved');
      return data;
    } else {
      throw Exception(data['message'] ?? 'Registration failed');
    }
  } catch (e) {
    print('❌ REGISTER ERROR: $e');
    print('═══════════════════════════════════════');
    rethrow;
  }
}

  // Test connection
  Future<bool> testConnection() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl.replaceAll('/api', '')}/'),
      ).timeout(const Duration(seconds: 5));

      print('Connection test: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      print('Connection test failed: $e');
      return false;
    }
  }

  // Verify QR Code
  Future<Map<String, dynamic>> verifyQRCode(String qrData) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.verifyQREndpoint}'),
        headers: await _getHeaders(),
        body: jsonEncode({'qr_data': qrData}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Verification failed');
      }
    } catch (e) {
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

  // Logout
  Future<void> logout() async {
    await _storage.clearAll();
  }
}