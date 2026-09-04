import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_endpoints.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  User? _user;
  bool _isLoading = false;
  String? _errorMessage;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.post(ApiEndpoints.login, {
        'username': username,
        'password': password,
      });

      final data = response['data'];
      final String token = data['accessToken'] ?? data['token'] ?? '';

      _user = User.fromJson(data);

      await _storageService.saveToken(token);
      await _storageService.saveUserData(jsonEncode(data));

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    await _storageService.clearAll();
    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    final userData = await _storageService.getUserData();
    final token = await _storageService.getToken();

    if (userData != null && token != null) {
      _user = User.fromJson(jsonDecode(userData));
      notifyListeners();
    }
  }
}
