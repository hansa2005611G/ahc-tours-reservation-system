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

  // Verify QR Code
  Future<bool> verifyQR(String qrData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await checkConnectivity();

      if (!_isOnline) {
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

      final response = await _apiService.verifyQRCode(qrData);
      _currentBooking = Booking.fromJson(response['data']['booking']);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Mark ticket as used
  Future<bool> markAsUsed(int bookingId, bool paymentReceived) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _apiService.markTicketAsUsed(bookingId, paymentReceived);
      _currentBooking = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Get today's schedules
  Future<void> fetchTodaySchedules() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _schedules = await _apiService.getTodaySchedules();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
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
      final bookingsData = await _apiService.getScheduleBookings(scheduleId);
      _bookings = bookingsData.map((b) => Booking.fromJson(b)).toList();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
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