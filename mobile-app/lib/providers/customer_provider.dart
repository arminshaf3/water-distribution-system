import 'package:flutter/material.dart';
import '../config/api_endpoints.dart';
import '../models/customer.dart';
import '../services/api_service.dart';

class CustomerProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Customer> _customers = [];
  bool _isLoading = false;

  List<Customer> get customers => _customers;
  bool get isLoading => _isLoading;

  Future<void> searchCustomers(String query) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.get(
        ApiEndpoints.customerSearch,
        params: {'search': query, 'size': '20'},
      );

      final List content = response['data']['content'];
      _customers = content.map((c) => Customer.fromJson(c)).toList();
    } catch (e) {
      _customers = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Customer?> registerCustomer({
    required String fullName,
    required String phoneNumber,
    required String address,
    required int villageId,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.post(ApiEndpoints.customers, {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        'address': address,
        'villageId': villageId,
      });

      _isLoading = false;
      notifyListeners();
      return Customer.fromJson(response['data']);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
