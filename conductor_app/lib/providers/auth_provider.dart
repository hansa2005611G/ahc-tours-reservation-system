import 'package:flutter/foundation.dart';
import 'package:conductor_app/models/user.dart';
import 'package:conductor_app/services/api_service.dart';
import 'package:conductor_app/services/storage_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  // Check if user is already logged in
  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final userData = await _storageService.getUser();
      if (userData != null) {
        _user = User.fromJson(userData);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Login
  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.login(username, password);
      _user = User.fromJson(response['data']['user']);
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

  // Register
  Future<bool> register({
    required String username,
    required String email,
    required String password,
    String? fullName,
    String? phone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('═══════════════════════════════════════');
      print('📱 AUTH PROVIDER - REGISTER ATTEMPT');
      print('═══════════════════════════════════════');
      print('Username: $username');
      print('Email: $email');
      print('Full Name: $fullName');
      print('Phone: $phone');
      
      final response = await _apiService.register(
        username: username,
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
      );
      
      print('Response received: $response');
      print('═══════════════════════════════════════');

      if (response['success'] == true) {
        // Use User model instead of raw map
        _user = User.fromJson(response['data']['user']);
        _error = null;
        
        print('✅ Registration successful!');
        print('User data: $_user');
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Registration failed';
        print('❌ Registration failed: $_error');
        
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      print('❌ Registration exception: $_error');
      print('═══════════════════════════════════════');
      
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    await _apiService.logout();
    _user = null;
    notifyListeners();
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}