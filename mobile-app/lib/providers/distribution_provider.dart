import 'package:flutter/material.dart';
import '../config/api_endpoints.dart';
import '../models/distribution.dart';
import '../models/receipt.dart';
import '../models/water_price.dart';
import '../services/api_service.dart';

class DistributionProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  WaterPrice? _activePrice;
  double _todaysCollection = 0.0;
  List<Distribution> _myDistributions = [];
  bool _isLoading = false;

  WaterPrice? get activePrice => _activePrice;
  double get todaysCollection => _todaysCollection;
  List<Distribution> get myDistributions => _myDistributions;
  bool get isLoading => _isLoading;

  Future<void> fetchActivePrice() async {
    try {
      final res = await _apiService.get(ApiEndpoints.activePrice);
      _activePrice = WaterPrice.fromJson(res['data']);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching active price: $e');
    }
  }

  Future<void> fetchTodaysCollection() async {
    try {
      final res = await _apiService.get(ApiEndpoints.todaysCollection);
      _todaysCollection = (res['data'] as num).toDouble();
      notifyListeners();
    } catch (e) {
      _todaysCollection = 0.0;
    }
  }

  Future<Distribution> recordDistribution({
    required int customerId,
    required double quantityLitres,
    double? previousMeterReading,
    double? currentMeterReading,
    bool collectPaymentNow = false,
    String? paymentMethod,
    String? referenceNumber,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.post(ApiEndpoints.distributions, {
        'customerId': customerId,
        'quantityLitres': quantityLitres,
        if (previousMeterReading != null)
          'previousMeterReading': previousMeterReading,
        if (currentMeterReading != null)
          'currentMeterReading': currentMeterReading,
        'collectPaymentNow': collectPaymentNow,
        if (paymentMethod != null) 'paymentMethod': paymentMethod,
        if (referenceNumber != null) 'referenceNumber': referenceNumber,
      });

      _isLoading = false;
      fetchTodaysCollection();
      fetchMyHistory(size: 500);
      notifyListeners();
      return Distribution.fromJson(res['data']);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Receipt> recordPayment({
    required int distributionId,
    required String paymentMethod,
    double? amount,
    String? referenceNumber,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.post(ApiEndpoints.payments, {
        'distributionId': distributionId,
        if (amount != null) 'amount': amount,
        'paymentMethod': paymentMethod,
        'referenceNumber': referenceNumber,
      });

      final paymentData = res['data'];
      final receiptNo = paymentData['receiptNumber'];

      final receiptRes =
          await _apiService.get('${ApiEndpoints.receipts}/$receiptNo');

      _isLoading = false;
      fetchTodaysCollection();
      fetchMyHistory(size: 500);
      notifyListeners();
      return Receipt.fromJson(receiptRes['data']);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> fetchMyHistory({int size = 10}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.get(
        ApiEndpoints.myDistributions,
        params: {'size': size.toString()},
      );
      final List content = res['data']['content'];
      _myDistributions = content.map((d) => Distribution.fromJson(d)).toList();
    } catch (e) {
      _myDistributions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchAllDistributions({int size = 500}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.get(
        ApiEndpoints.distributions,
        params: {'size': size.toString()},
      );
      final List content = res['data']['content'];
      _myDistributions = content.map((d) => Distribution.fromJson(d)).toList();
    } catch (e) {
      _myDistributions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
