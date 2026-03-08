import 'package:flutter/foundation.dart';
import 'package:conductor_app/models/booking.dart';
import 'package:conductor_app/services/api_service.dart';
import 'package:conductor_app/services/storage_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class BookingProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  List<dynamic> _schedules = [];
  List<Booking> _bookings = [];
  Booking? _currentBooking;
  bool _isLoading = false;
  String? _error;
  bool _isOnline = true;

  List<dynamic> get schedules => _schedules;
  List<Booking> get bookings => _bookings;
  Booking? get currentBooking => _currentBooking;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOnline => _isOnline;

  // Check connectivity
  Future<void> checkConnectivity() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    _isOnline = connectivityResult != ConnectivityResult.none;
    notifyListeners();
  }

  // Verify QR Code - MAIN METHOD
  Future<bool> verifyQR(String qrData) async {
    _isLoading = true;
    _error = null;
    _currentBooking = null;
    notifyListeners();

    try {
      print('═══════════════════════════════════════');
      print('📱 BookingProvider: Verifying QR...');
      print('QR Data: $qrData');
      
      await checkConnectivity();

      if (!_isOnline) {
        print('⚠️ Offline mode detected');
        // Offline mode - save to local storage
        final bookingData = {
          'qr_data': qrData,
          'timestamp': DateTime.now().toIso8601String(),
          'status': 'pending_sync',
        };
        await _storageService.saveOfflineBooking(bookingData);
        _error = 'Offline mode: Booking saved locally';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      print('🌐 Online - calling API...');
      final response = await _apiService.verifyQRCode(qrData);
      
      print('Response received:');
      print('Success: ${response['success']}');
      print('Data: ${response['data']}');
      print('Booking data: ${response['data']?['booking']}');
      
      if (response['success'] == true && response['data'] != null) {
        final bookingData = response['data']['booking'];
        
        if (bookingData != null) {
          print('Creating Booking object...');
          _currentBooking = Booking.fromJson(bookingData);
          print('✅ Booking created: $_currentBooking');
          print('Booking ID: ${_currentBooking?.bookingId}');
          print('Passenger: ${_currentBooking?.passengerName}');
          print('═══════════════════════════════════════');
          
          _isLoading = false;
          notifyListeners();
          return true;
        } else {
          throw Exception('No booking data in response');
        }
      } else {
        throw Exception(response['message'] ?? 'Verification failed');
      }
    } catch (e, stackTrace) {
      _error = e.toString().replaceAll('Exception: ', '');
      print('❌ BookingProvider error: $_error');
      print('Stack trace: $stackTrace');
      print('═══════════════════════════════════════');
      
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Alias for verifyQR - ADDED THIS FOR COMPATIBILITY
  Future<bool> verifyQRCode(String qrData) async {
    return verifyQR(qrData);
  }

  // Mark ticket as used
  Future<bool> markTicketAsUsed(int bookingId, bool paymentReceived) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('═══════════════════════════════════════');
      print('📝 BookingProvider: Marking ticket as used...');
      print('Booking ID: $bookingId');
      print('Payment Received: $paymentReceived');
      
      await _apiService.markTicketAsUsed(bookingId, paymentReceived);
      
      print('✅ Ticket marked as used successfully');
      print('═══════════════════════════════════════');
      
      _currentBooking = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e, stackTrace) {
      _error = e.toString().replaceAll('Exception: ', '');
      print('❌ Mark as used error: $_error');
      print('Stack trace: $stackTrace');
      print('═══════════════════════════════════════');
      
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Alias for backward compatibility
  Future<bool> markAsUsed(int bookingId, bool paymentReceived) async {
    return markTicketAsUsed(bookingId, paymentReceived);
  }

  // Get today's schedules
  Future<void> fetchTodaySchedules() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('📅 Fetching today\'s schedules...');
      _schedules = await _apiService.getTodaySchedules();
      print('✅ Fetched ${_schedules.length} schedules');
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      print('❌ Fetch schedules error: $_error');
      
      _isLoading = false;
      notifyListeners();
    }
  }

  // Get schedule bookings
  Future<void> fetchScheduleBookings(int scheduleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('📋 Fetching bookings for schedule $scheduleId...');
      final bookingsData = await _apiService.getScheduleBookings(scheduleId);
      _bookings = bookingsData.map((b) => Booking.fromJson(b)).toList();
      print('✅ Fetched ${_bookings.length} bookings');
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      print('❌ Fetch bookings error: $_error');
      
      _isLoading = false;
      notifyListeners();
    }
  }

  // Sync offline bookings
  Future<void> syncOfflineBookings() async {
    try {
      final offlineBookings = await _storageService.getOfflineBookings();
      
      if (offlineBookings.isEmpty) {
        print('No offline bookings to sync');
        return;
      }

      print('Syncing ${offlineBookings.length} offline bookings...');
      
      for (var booking in offlineBookings) {
        try {
          // Attempt to verify the QR code
          await _apiService.verifyQRCode(booking['qr_data']);
          print('✅ Synced booking: ${booking['qr_data']}');
        } catch (e) {
          print('❌ Failed to sync booking: ${booking['qr_data']}');
        }
      }

      // Clear offline bookings after sync
      await _storageService.clearOfflineBookings();
      print('✅ Offline bookings synced and cleared');
    } catch (e) {
      print('❌ Sync error: $e');
    }
  }

  // Clear current booking
  void clearCurrentBooking() {
    _currentBooking = null;
    notifyListeners();
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}