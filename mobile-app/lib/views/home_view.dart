import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_endpoints.dart';
import '../models/customer.dart';
import '../models/distribution.dart';
import '../models/water_price.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

enum _CollectorScreen {
  dashboard,
  search,
  record,
  receipt,
  history,
  notifications,
  closeAccount,
}

enum _HistoryFilter { all, paid, unpaid }

enum _CalcMode { meter, direct }

enum _PaymentMethod { cash, online }

class _CollectorNotification {
  final String id;
  final String title;
  final String message;
  final String timestamp;

  const _CollectorNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
  });

  factory _CollectorNotification.fromJson(Map<String, dynamic> json) {
    return _CollectorNotification(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Live Admin Sync',
      message: json['message'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'timestamp': timestamp,
    };
  }
}

class HomeView extends StatefulWidget {
  const HomeView({Key? key}) : super(key: key);

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color blue600 = Color(0xFF2563EB);
  static const Color indigo600 = Color(0xFF4F46E5);
  static const Color emerald600 = Color(0xFF059669);
  static const Color emerald500 = Color(0xFF10B981);
  static const Color rose600 = Color(0xFFE11D48);
  static const Color amber600 = Color(0xFFD97706);

  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _previousController =
      TextEditingController(text: '120');
  final TextEditingController _currentController =
      TextEditingController(text: '180');
  final TextEditingController _directController =
      TextEditingController(text: '60');
  final TextEditingController _settleReferenceController =
      TextEditingController();

  Timer? _pollTimer;
  _CollectorScreen _screen = _CollectorScreen.dashboard;
  _HistoryFilter _historyFilter = _HistoryFilter.all;
  _CalcMode _calcMode = _CalcMode.meter;
  _PaymentMethod _paymentMethod = _PaymentMethod.cash;
  _PaymentMethod _settlePaymentMethod = _PaymentMethod.cash;

  WaterPrice? _activePrice;
  List<Customer> _customers = [];
  List<Distribution> _history = [];
  List<_CollectorNotification> _notifications = [];
  Set<String> _notifiedNoticeIds = {};
  Set<String> _dismissedNoticeIds = {};
  Customer? _selectedCustomer;
  Distribution? _lastDistribution;
  Distribution? _selectedInvoice;
  Distribution? _settlingBill;
  String? _adminPaymentNotice;
  String? _activeNoticeId;
  int? _expandedBillId;
  DateTime? _lastShiftClose;
  bool _loading = false;
  bool _settleLoading = false;
  bool _showSlabsModal = false;
  bool _showInvoiceModal = false;
  bool _showSettlePaymentModal = false;
  bool _showShiftCloseSuccessModal = false;
  String? _error;

  final Map<int, String> _previousStatusMap = {};
  final Set<int> _locallySettledDistIds = {};

  @override
  void initState() {
    super.initState();
    _bootstrapCollectorApp();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _fetchCollectorData(silent: true);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _searchController.dispose();
    _previousController.dispose();
    _currentController.dispose();
    _directController.dispose();
    _settleReferenceController.dispose();
    super.dispose();
  }

  Future<void> _bootstrapCollectorApp() async {
    await _loadLocalState();
    await _fetchCollectorData(isInitialBootstrap: true);
    if (mounted) {
      await _searchCustomers();
    }
  }

  Future<void> _loadLocalState() async {
    final prefs = await SharedPreferences.getInstance();
    final notificationsJson = prefs.getString('water_dist_notifications');
    final notifiedJson = prefs.getString('water_dist_notified_payment_ids');
    final dismissedJson = prefs.getString('water_dist_dismissed_notices');
    final lastClose = prefs.getString('water_dist_last_shift_close');

    List<_CollectorNotification> parsedNotifications = [];
    if (notificationsJson != null) {
      try {
        final List decoded = jsonDecode(notificationsJson);
        parsedNotifications = decoded
            .map((item) => _CollectorNotification.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList();
      } catch (_) {}
    }

    Set<String> parsedNotified = {};
    if (notifiedJson != null) {
      try {
        parsedNotified = Set<String>.from(jsonDecode(notifiedJson));
      } catch (_) {}
    }

    Set<String> parsedDismissed = {};
    if (dismissedJson != null) {
      try {
        parsedDismissed = Set<String>.from(jsonDecode(dismissedJson));
      } catch (_) {}
    }

    setState(() {
      _notifications = parsedNotifications;
      _notifiedNoticeIds = parsedNotified;
      _dismissedNoticeIds = parsedDismissed;
      _lastShiftClose = lastClose != null ? DateTime.tryParse(lastClose) : null;
    });
  }

  Future<void> _persistNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'water_dist_notifications',
      jsonEncode(_notifications.map((item) => item.toJson()).toList()),
    );
    await prefs.setString(
      'water_dist_notified_payment_ids',
      jsonEncode(_notifiedNoticeIds.toList()),
    );
    await prefs.setString(
      'water_dist_dismissed_notices',
      jsonEncode(_dismissedNoticeIds.toList()),
    );
  }

  Future<void> _fetchCollectorData({
    bool silent = false,
    bool isInitialBootstrap = false,
  }) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final results = await Future.wait<dynamic>([
        _apiService.get(ApiEndpoints.activePrice),
        _apiService.get(ApiEndpoints.distributions, params: {'size': '500'}),
      ]);

      final priceData = results[0]['data'];
      final List distributionContent = results[1]['data']['content'] ?? [];
      final fetchedHistory = distributionContent
          .map((item) => Distribution.fromJson(Map<String, dynamic>.from(item)))
          .toList();

      final newNotifications = <_CollectorNotification>[];
      final updatedNotified = Set<String>.from(_notifiedNoticeIds);

      for (final item in fetchedHistory) {
        final prevStatus = _previousStatusMap[item.id];
        final currentIsPaid = _isPaidStatus(item.paymentStatus);

        // ONLY notify collector if a bill was previously UNPAID and was settled as PAID by ADMIN
        // (and NOT settled locally by the collector themselves in this app session)
        if (!isInitialBootstrap &&
            prevStatus != null &&
            !_isPaidStatus(prevStatus) &&
            currentIsPaid &&
            !_locallySettledDistIds.contains(item.id)) {
          final noticeId =
              'ADMIN-PAID-${item.distributionCode.isNotEmpty ? item.distributionCode : item.id}';
          if (!updatedNotified.contains(noticeId)) {
            updatedNotified.add(noticeId);
            final message =
                'Admin Settled: Invoice #${item.receiptNumber ?? item.distributionCode} for ${item.customerName} (Rs. ${item.totalAmount.toStringAsFixed(2)}) has been PAID & confirmed by Admin.';
            final notice = _CollectorNotification(
              id: noticeId,
              title: 'Payment Confirmed by Admin',
              message: message,
              timestamp: DateFormat('hh:mm a').format(DateTime.now()),
            );
            newNotifications.add(notice);

            if (!_dismissedNoticeIds.contains(noticeId)) {
              _adminPaymentNotice = message;
              _activeNoticeId = noticeId;
            }
          }
        }

        _previousStatusMap[item.id] = item.paymentStatus;
      }

      if (!mounted) return;
      setState(() {
        _activePrice =
            priceData != null ? WaterPrice.fromJson(priceData) : _activePrice;
        _history = fetchedHistory;
        _notifiedNoticeIds = updatedNotified;
        if (newNotifications.isNotEmpty) {
          _notifications = [...newNotifications, ..._notifications];
        }
      });

      if (newNotifications.isNotEmpty) {
        await _persistNotifications();
      }
    } catch (e) {
      if (!silent && mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    } finally {
      if (!silent && mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _searchCustomers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _apiService.get(
        ApiEndpoints.customerSearch,
        params: {
          'search': _searchController.text.trim(),
          'size': '20',
        },
      );
      final List content = response['data']['content'] ?? [];
      final fetched = content
          .map((item) => Customer.fromJson(Map<String, dynamic>.from(item)))
          .toList();

      setState(() {
        _customers = fetched.isNotEmpty ? fetched : _fallbackCustomers();
      });
    } catch (_) {
      setState(() {
        _customers = _fallbackCustomers();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<Customer> _fallbackCustomers() {
    return [
      Customer(
        id: 1,
        customerCode: 'CUST-GVC-0001',
        fullName: 'Robert Smith',
        phoneNumber: '+94771234567',
        address: '45 Water Tank Road, Sector 3',
        villageId: 1,
        villageName: 'Green Valley Central',
        meterNumber: 'MTR-1001',
        lastMeterReading: 120,
        status: 'ACTIVE',
      ),
      Customer(
        id: 2,
        customerCode: 'CUST-GVC-0002',
        fullName: 'Sarah Jenkins',
        phoneNumber: '+94772345678',
        address: '12 Palm Grove, Main Street',
        villageId: 1,
        villageName: 'Green Valley Central',
        meterNumber: 'MTR-1002',
        lastMeterReading: 85,
        status: 'ACTIVE',
      ),
      Customer(
        id: 3,
        customerCode: 'CUST-GVC-0003',
        fullName: 'Michael Brown',
        phoneNumber: '+94773456789',
        address: '88 Lakeview Avenue',
        villageId: 1,
        villageName: 'Green Valley Central',
        meterNumber: 'MTR-1003',
        lastMeterReading: 210,
        status: 'ACTIVE',
      ),
    ];
  }

  void _selectCustomer(Customer customer) {
    final previous = customer.lastMeterReading ?? 120;
    _selectedCustomer = customer;
    _previousController.text = _numberText(previous);
    _currentController.text = _numberText(previous + 60);
    _directController.text = '60';
    setState(() {
      _screen = _CollectorScreen.record;
    });
  }

  Future<void> _recordDistribution(bool isPaid) async {
    final customer = _selectedCustomer;
    if (customer == null) return;

    if (_computedLitres <= 0) {
      _showSnack('Calculated quantity must be greater than 0.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final body = {
        'customerId': customer.id,
        'quantityLitres': _computedLitres,
        if (_calcMode == _CalcMode.meter)
          'previousMeterReading': _previousReading,
        if (_calcMode == _CalcMode.meter)
          'currentMeterReading': _currentReading,
        'collectPaymentNow': isPaid,
        if (isPaid) 'paymentMethod': _paymentMethodValue(_paymentMethod),
        if (isPaid)
          'referenceNumber': 'REF-${DateTime.now().millisecondsSinceEpoch}',
      };

      final response = await _apiService.post(ApiEndpoints.distributions, body);
      var distribution = Distribution.fromJson(
        Map<String, dynamic>.from(response['data']),
      ).copyWith(
        paymentStatus: isPaid ? 'PAID' : 'PENDING',
        previousMeterReading:
            _calcMode == _CalcMode.meter ? _previousReading : null,
        currentMeterReading:
            _calcMode == _CalcMode.meter ? _currentReading : null,
        paymentMethod: isPaid ? _paymentMethodValue(_paymentMethod) : null,
      );

      if (distribution.receiptNumber == null && isPaid) {
        distribution = distribution.copyWith(
          receiptNumber:
              'WTR-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
        );
      }

      if (isPaid) {
        _locallySettledDistIds.add(distribution.id);
        _previousStatusMap[distribution.id] = 'PAID';
      } else {
        _previousStatusMap[distribution.id] = 'PENDING';
      }

      setState(() {
        _lastDistribution = distribution;
        _history = [distribution, ..._history];
        _selectedCustomer = customer.copyWith(
          lastMeterReading:
              _calcMode == _CalcMode.meter ? _currentReading : null,
        );
        _screen = _CollectorScreen.receipt;
      });

      await _fetchCollectorData(silent: true);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
      _showSnack(_error ?? 'Failed to process water billing.');
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _confirmSettlePayment() async {
    final bill = _settlingBill;
    if (bill == null) return;

    setState(() {
      _settleLoading = true;
    });

    var paidItem = bill.copyWith(
      paymentStatus: 'PAID',
      paymentMethod: _paymentMethodValue(_settlePaymentMethod),
    );

    try {
      final response = await _apiService.post(ApiEndpoints.payments, {
        'distributionId': bill.id,
        'amount': bill.totalAmount,
        'paymentMethod': _paymentMethodValue(_settlePaymentMethod),
        'referenceNumber': _settleReferenceController.text.trim().isEmpty
            ? 'FIELD-SETTLE-${DateTime.now().millisecondsSinceEpoch}'
            : _settleReferenceController.text.trim(),
      });
      final receiptNo = response['data']?['receiptNumber'];
      if (receiptNo != null) {
        paidItem = paidItem.copyWith(receiptNumber: receiptNo);
      }
    } catch (_) {
      paidItem = paidItem.copyWith(
        receiptNumber:
            'WTR-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      );
    }

    _locallySettledDistIds.add(bill.id);
    _previousStatusMap[bill.id] = 'PAID';

    setState(() {
      _history = _history
          .map((item) => item.id == paidItem.id ? paidItem : item)
          .toList();
      _lastDistribution = paidItem;
      _settlingBill = null;
      _showSettlePaymentModal = false;
      _screen = _CollectorScreen.receipt;
      _settleLoading = false;
      _settleReferenceController.clear();
    });

    await _fetchCollectorData(silent: true);
  }

  Future<void> _closeShift() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    await prefs.setString('water_dist_last_shift_close', now.toIso8601String());
    await prefs.remove('water_dist_notifications');
    await prefs.remove('water_dist_dismissed_notices');

    setState(() {
      _lastShiftClose = now;
      _notifications = [];
      _dismissedNoticeIds = {};
      _adminPaymentNotice = null;
      _showShiftCloseSuccessModal = true;
      _screen = _CollectorScreen.dashboard;
    });
  }

  void _dismissLiveBanner() {
    final noticeId = _activeNoticeId;
    if (noticeId != null) {
      _dismissedNoticeIds = {..._dismissedNoticeIds, noticeId};
      _persistNotifications();
    }
    setState(() {
      _adminPaymentNotice = null;
      _activeNoticeId = null;
    });
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  bool _isPaidStatus(String? status) {
    final normalized = (status ?? '').toUpperCase();
    return normalized == 'PAID' || normalized == 'COMPLETED';
  }

  bool _isInActiveShift(String dateString) {
    final date = DateTime.tryParse(dateString);
    if (date == null) return true;
    if (_lastShiftClose != null && !date.isAfter(_lastShiftClose!)) {
      return false;
    }
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  List<Distribution> get _activeShiftDistributions {
    return _history
        .where((item) => _isInActiveShift(item.distributionDate))
        .toList();
  }

  List<Distribution> get _filteredHistory {
    final active = _activeShiftDistributions;
    switch (_historyFilter) {
      case _HistoryFilter.paid:
        return active
            .where((item) => _isPaidStatus(item.paymentStatus))
            .toList();
      case _HistoryFilter.unpaid:
        return active
            .where((item) => !_isPaidStatus(item.paymentStatus))
            .toList();
      case _HistoryFilter.all:
        return active;
    }
  }

  List<WaterPriceTier> get _tiersToUse {
    final tiers = _activePrice?.tiers ?? [];
    if (tiers.isNotEmpty) return tiers;
    return [
      WaterPriceTier(
        tierName: 'Tier 1 - Essential (0-20L)',
        minLitres: 0,
        maxLitres: 20,
        pricePerLitre: 4,
      ),
      WaterPriceTier(
        tierName: 'Tier 2 - Standard (21-50L)',
        minLitres: 21,
        maxLitres: 50,
        pricePerLitre: 5,
      ),
      WaterPriceTier(
        tierName: 'Tier 3 - High Use (51+L)',
        minLitres: 51,
        pricePerLitre: 6.5,
      ),
    ];
  }

  WaterPriceTier get _matchingTier {
    final litres = _computedLitres;
    for (final tier in _tiersToUse) {
      final max = tier.maxLitres;
      if (litres >= tier.minLitres && (max == null || litres <= max)) {
        return tier;
      }
    }
    return _tiersToUse.last;
  }

  double get _unitPrice => _matchingTier.pricePerLitre;
  double get _computedTotal => _computedLitres * _unitPrice;

  double get _previousReading =>
      double.tryParse(_previousController.text.trim()) ?? 0;
  double get _currentReading =>
      double.tryParse(_currentController.text.trim()) ?? 0;
  double get _directLitres =>
      double.tryParse(_directController.text.trim()) ?? 0;
  double get _computedLitres {
    if (_calcMode == _CalcMode.meter) {
      return (_currentReading - _previousReading).clamp(0, double.infinity);
    }
    return _directLitres.clamp(0, double.infinity);
  }

  int get _paidCount => _activeShiftDistributions
      .where((item) => _isPaidStatus(item.paymentStatus))
      .length;
  int get _unpaidCount => _activeShiftDistributions.length - _paidCount;
  double get _totalBilledAmount =>
      _activeShiftDistributions.fold(0, (sum, item) => sum + item.totalAmount);
  double get _todaysPaidSum => _activeShiftDistributions
      .where((item) => _isPaidStatus(item.paymentStatus))
      .fold(0, (sum, item) => sum + item.totalAmount);
  double get _todaysUnpaidSum => _activeShiftDistributions
      .where((item) => !_isPaidStatus(item.paymentStatus))
      .fold(0, (sum, item) => sum + item.totalAmount);
  double get _totalShiftAmount => _todaysPaidSum + _todaysUnpaidSum;
  double get _paidPercent =>
      _totalShiftAmount > 0 ? _todaysPaidSum / _totalShiftAmount : 1.0;

  String _paymentMethodValue(_PaymentMethod method) {
    return method == _PaymentMethod.cash ? 'CASH' : 'ONLINE';
  }

  String _numberText(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }

  String _formatDate(String dateString) {
    final date = DateTime.tryParse(dateString);
    if (date == null) return dateString;
    return DateFormat('MMM d, yyyy hh:mm a').format(date);
  }

  Future<void> _copyReceiptText(Distribution item) async {
    final text = '''
AQUADISTRIBUTE WATER BILL RECEIPT
------------------------------------
Receipt No: ${item.receiptNumber ?? item.distributionCode}
Customer: ${item.customerName} (${item.customerCode})
Quantity Consumed: ${_numberText(item.quantityLitres)} Litres
Applied Rate: Rs. ${item.pricePerLitre.toStringAsFixed(2)}/L
Total Billed: Rs. ${item.totalAmount.toStringAsFixed(2)}
Collector / Officer: ${item.collectorName}
Payment Status: ${_isPaidStatus(item.paymentStatus) ? 'PAID (Confirmed)' : 'UNPAID (Pending Bill)'}
Date: ${_formatDate(item.distributionDate)}
------------------------------------
Thank you for your water service!
''';
    await Clipboard.setData(ClipboardData(text: text));
    _showSnack('Receipt text copied. Paste it into WhatsApp.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(child: _buildCurrentScreen()),
            if (_adminPaymentNotice != null) _buildLiveNotice(),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildBottomNavigation(),
            ),
            if (_showSlabsModal) _buildSlabsModal(),
            if (_showInvoiceModal && _selectedInvoice != null)
              _buildInvoiceModal(_selectedInvoice!),
            if (_showSettlePaymentModal && _settlingBill != null)
              _buildSettlePaymentModal(_settlingBill!),
            if (_showShiftCloseSuccessModal) _buildShiftSuccessModal(),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentScreen() {
    switch (_screen) {
      case _CollectorScreen.dashboard:
        return _buildDashboard();
      case _CollectorScreen.search:
        return _buildSearch();
      case _CollectorScreen.record:
        return _buildRecord();
      case _CollectorScreen.receipt:
        return _buildReceipt();
      case _CollectorScreen.history:
        return _buildHistory();
      case _CollectorScreen.notifications:
        return _buildNotifications();
      case _CollectorScreen.closeAccount:
        return _buildCloseAccount();
    }
  }

  Widget _buildDashboard() {
    final authProvider = Provider.of<AuthProvider>(context);
    final userName = authProvider.user?.fullName ?? 'John Collector';
    final currentSlab = _matchingTier.tierName.split('-').first.trim();

    return RefreshIndicator(
      onRefresh: _fetchCollectorData,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 92),
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 26, 24, 58),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [blue600, blue600, indigo600],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
            ),
            child: Row(
              children: [
                _circleIcon(Icons.person_outline, Colors.white, Colors.white24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Text(
                        'Field Officer - Sector 3',
                        style: TextStyle(
                          color: Color(0xFFDBEAFE),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                _roundHeaderButton(
                  icon: Icons.notifications_none_rounded,
                  onTap: () =>
                      setState(() => _screen = _CollectorScreen.notifications),
                  badge: _notifications.isNotEmpty
                      ? _notifications.length.toString()
                      : null,
                ),
                const SizedBox(width: 8),
                _roundHeaderButton(
                  icon: Icons.logout,
                  onTap: () async {
                    await authProvider.logout();
                    if (!mounted) return;
                    Navigator.of(context).pushNamedAndRemoveUntil(
                      '/login',
                      (route) => false,
                    );
                  },
                ),
              ],
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -40),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _whitePanel(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'TODAY\'S COLLECTION',
                            style: TextStyle(
                              color: slate400,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.auto_awesome,
                                  color: emerald600, size: 13),
                              SizedBox(width: 4),
                              Text(
                                'LIVE',
                                style: TextStyle(
                                  color: emerald600,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Rs. ${_todaysPaidSum.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: slate900,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _showSlabsModal = true),
                            child: _rateStat(
                              'Active Rate (Click for Slabs)',
                              'Rs. ${_unitPrice.toStringAsFixed(2)} / L',
                              blue600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 18),
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _showSlabsModal = true),
                            child: _rateStat(
                              'Current Slab',
                              currentSlab,
                              slate900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'QUICK SERVICES',
                  style: TextStyle(
                    color: slate400,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 1.18,
                  children: [
                    _quickTile(
                      icon: Icons.speed_rounded,
                      iconColor: blue600,
                      iconBg: const Color(0xFFEFF6FF),
                      title: 'Record Meter',
                      subtitle: 'Household billing',
                      onTap: () {
                        _searchController.clear();
                        _searchCustomers();
                        setState(() => _screen = _CollectorScreen.search);
                      },
                    ),
                    _quickTile(
                      icon: Icons.receipt_long_outlined,
                      iconColor: amber600,
                      iconBg: const Color(0xFFFFFBEB),
                      title: 'All Bill History',
                      subtitle: 'Paid & Unpaid Bills',
                      onTap: () => setState(() {
                        _historyFilter = _HistoryFilter.all;
                        _screen = _CollectorScreen.history;
                      }),
                    ),
                    _quickTile(
                      icon: Icons.person_outline_rounded,
                      iconColor: indigo600,
                      iconBg: const Color(0xFFEEF2FF),
                      title: 'Households',
                      subtitle: 'Customer List',
                      onTap: () {
                        _searchController.clear();
                        _searchCustomers();
                        setState(() => _screen = _CollectorScreen.search);
                      },
                    ),
                    _quickTile(
                      icon: Icons.error_outline_rounded,
                      iconColor: rose600,
                      iconBg: const Color(0xFFFFF1F2),
                      title: 'Unpaid Bills',
                      subtitle: _unpaidCount > 0
                          ? '$_unpaidCount Pending Credit'
                          : 'All Paid & Clear',
                      subtitleColor: rose600,
                      badge: _unpaidCount > 0 ? _unpaidCount.toString() : null,
                      onTap: () => setState(() {
                        _historyFilter = _HistoryFilter.unpaid;
                        _screen = _CollectorScreen.history;
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () =>
                      setState(() => _screen = _CollectorScreen.closeAccount),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [slate900, Color(0xFF172554), slate900],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: slate800),
                    ),
                    child: Row(
                      children: [
                        _squareIcon(
                          Icons.lock_outline,
                          const Color(0xFFFF6B93),
                          const Color(0xFF4C1534),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'End Shift / Account Close',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'View Paid vs Unpaid & Reset 0',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: slate400,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x334C1534),
                            border: Border.all(color: const Color(0xFF9F315E)),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Text(
                            'CLOSE SHIFT',
                            style: TextStyle(
                              color: Color(0xFFFFA3B8),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                InkWell(
                  onTap: () => setState(() => _showSlabsModal = true),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [blue600, indigo600],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ACTIVE SYSTEM TARIFF',
                                style: TextStyle(
                                  color: Color(0xFFBFDBFE),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Tier 3 High Usage (51+ L)',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                'Click to view complete slab table',
                                style: TextStyle(
                                  color: Color(0xFFDBEAFE),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.auto_awesome, color: Colors.white),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearch() {
    return Column(
      children: [
        _screenHeader(
          title: 'Select Household',
          onBack: () => setState(() => _screen = _CollectorScreen.dashboard),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 92),
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(
                        color: slate900,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: _lightInputDecoration(
                        'Search customer name or code...',
                      ),
                      onSubmitted: (_) => _searchCustomers(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _blueIconButton(Icons.search, _searchCustomers),
                ],
              ),
              const SizedBox(height: 16),
              if (_loading && _customers.isEmpty)
                const Center(child: CircularProgressIndicator())
              else
                ..._customers.map(_customerCard),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRecord() {
    final customer = _selectedCustomer;
    if (customer == null) return _buildDashboard();

    return Column(
      children: [
        _screenHeader(
          title: 'Record Water Meter',
          onBack: () => setState(() => _screen = _CollectorScreen.search),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 92),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customer.fullName,
                            style: const TextStyle(
                              color: slate900,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            '${customer.customerCode} - ${customer.address}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: slate500,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _statusPill('ACTIVE', blue600),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _segmentedControl(
                leftLabel: 'Household Meter',
                rightLabel: 'Direct Litres',
                leftSelected: _calcMode == _CalcMode.meter,
                onLeft: () => setState(() => _calcMode = _CalcMode.meter),
                onRight: () => setState(() => _calcMode = _CalcMode.direct),
              ),
              const SizedBox(height: 16),
              if (_calcMode == _CalcMode.meter)
                Row(
                  children: [
                    Expanded(
                      child: _numberField(
                        label: 'Previous Reading',
                        controller: _previousController,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _numberField(
                        label: 'Current Reading',
                        controller: _currentController,
                      ),
                    ),
                  ],
                )
              else
                _numberField(
                  label: 'Quantity (Litres)',
                  controller: _directController,
                ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [slate900, Color(0xFF172554)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: slate800),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  children: [
                    _darkCalcRow(
                      'Volume Consumed:',
                      '${_numberText(_computedLitres)} Litres',
                      const Color(0xFF60A5FA),
                    ),
                    _darkCalcRow(
                      'Admin Matching Tier:',
                      _matchingTier.tierName,
                      const Color(0xFFFBBF24),
                    ),
                    _darkCalcRow(
                      'Whole Volume Rate:',
                      'Rs. ${_unitPrice.toStringAsFixed(2)} / L',
                      const Color(0xFF34D399),
                    ),
                    const Divider(color: slate800, height: 22),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'CALCULATED TOTAL:',
                            style: TextStyle(
                              color: Color(0xFFCBD5E1),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        Text(
                          'Rs. ${_computedTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Color(0xFF34D399),
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Payment Method',
                style: TextStyle(
                  color: slate700,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              _paymentSelector(
                selected: _paymentMethod,
                onChanged: (value) => setState(() => _paymentMethod = value),
              ),
              const SizedBox(height: 18),
              _gradientButton(
                text: _loading
                    ? 'Processing Billing...'
                    : 'Confirm Payment & Collect',
                icon: Icons.check_circle_outline,
                onTap: _loading ? null : () => _recordDistribution(true),
              ),
              const SizedBox(height: 10),
              _outlinedDangerButton(
                text: 'Generate Bill Only (Not Paid)',
                icon: Icons.error_outline,
                onTap: _loading ? null : () => _recordDistribution(false),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: const TextStyle(
                    color: rose600,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReceipt() {
    final item = _lastDistribution;
    if (item == null) return _buildDashboard();
    final paid = _isPaidStatus(item.paymentStatus);

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 92),
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: paid ? const Color(0xFFD1FAE5) : const Color(0xFFFFE4E6),
            shape: BoxShape.circle,
          ),
          child: Icon(
            paid ? Icons.check_circle_outline : Icons.error_outline,
            color: paid ? emerald600 : rose600,
            size: 42,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          paid ? 'Payment Recorded!' : 'Bill Generated (Unpaid)',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: slate900,
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          paid
              ? 'Digital receipt issued successfully'
              : 'Customer credit bill created. Marked as UNPAID.',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: slate400,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 22),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: paid
                  ? const [blue600, indigo600]
                  : const [slate800, Color(0xFF881337)],
            ),
            borderRadius: BorderRadius.circular(26),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'AQUADISTRIBUTE PASS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  const Icon(Icons.credit_card, color: Colors.white70),
                ],
              ),
              const Divider(color: Colors.white24, height: 24),
              Text(
                item.receiptNumber ?? item.distributionCode,
                style: const TextStyle(
                  color: Color(0xFFDBEAFE),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: _receiptPassStat('Customer', item.customerName),
                  ),
                  _receiptPassStat(
                    'Billed Amount',
                    'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                    alignRight: true,
                    valueColor: paid
                        ? const Color(0xFF6EE7B7)
                        : const Color(0xFFFFA3B8),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _whitePanel(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _infoRow(
                  'Volume Consumed:', '${_numberText(item.quantityLitres)} L'),
              _infoRow(
                'Applied Rate:',
                'Rs. ${item.pricePerLitre.toStringAsFixed(2)}/L',
              ),
              const Divider(height: 18),
              _infoRow(
                'Status:',
                paid ? 'PAID (CONFIRMED)' : 'UNPAID (CREDIT RECORD)',
                valueColor: paid ? emerald600 : rose600,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _solidButton(
                text: 'Share WhatsApp',
                icon: Icons.share_outlined,
                color: emerald600,
                onTap: () => _copyReceiptText(item),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _solidButton(
                text: 'View Invoice',
                icon: Icons.visibility_outlined,
                color: blue600,
                onTap: () => setState(() {
                  _selectedInvoice = item;
                  _showInvoiceModal = true;
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _darkButton(
          text: 'Back to Home Dashboard',
          onTap: () => setState(() => _screen = _CollectorScreen.dashboard),
        ),
      ],
    );
  }

  Widget _buildHistory() {
    return Column(
      children: [
        _screenHeader(
          title: 'All Bill History',
          onBack: () => setState(() => _screen = _CollectorScreen.dashboard),
          trailing: _smallHeaderBadge('${_history.length} Records'),
        ),
        Container(
          color: slate900,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: _summaryLabel(
                  'TOTAL BILLED',
                  'Rs. ${_totalBilledAmount.toStringAsFixed(2)}',
                  Colors.white,
                ),
              ),
              _summaryLabel('PAID', '$_paidCount', emerald500),
              const SizedBox(width: 18),
              _summaryLabel('UNPAID', '$_unpaidCount', rose600),
            ],
          ),
        ),
        Container(
          color: slate100,
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _filterButton(_HistoryFilter.all,
                  'All (${_activeShiftDistributions.length})'),
              const SizedBox(width: 6),
              _filterButton(_HistoryFilter.paid, 'Paid ($_paidCount)'),
              const SizedBox(width: 6),
              _filterButton(_HistoryFilter.unpaid, 'Unpaid ($_unpaidCount)'),
            ],
          ),
        ),
        Expanded(
          child: _filteredHistory.isEmpty
              ? ListView(
                  padding: const EdgeInsets.fromLTRB(18, 24, 18, 92),
                  children: [
                    _emptyState(
                      title: 'All Accounts Clear!',
                      text: _historyFilter == _HistoryFilter.unpaid
                          ? 'All customer credit bills have been paid & settled.'
                          : 'No bill records found under this filter.',
                    ),
                  ],
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 92),
                  children: _filteredHistory.map(_historyCard).toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildNotifications() {
    return Column(
      children: [
        _screenHeader(
          title: 'Notifications Inbox',
          onBack: () => setState(() => _screen = _CollectorScreen.dashboard),
          trailing: _smallHeaderBadge('${_notifications.length} Messages'),
        ),
        Expanded(
          child: _notifications.isEmpty
              ? ListView(
                  padding: const EdgeInsets.fromLTRB(18, 24, 18, 92),
                  children: [
                    _emptyState(
                      title: 'No Notifications Yet',
                      text:
                          'Admin payment updates for this shift will appear here.',
                      icon: Icons.notifications_none_rounded,
                    ),
                  ],
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 92),
                  children: _notifications.map((note) {
                    return _whitePanel(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              _miniIcon(Icons.auto_awesome, emerald600,
                                  const Color(0xFFD1FAE5)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  note.title,
                                  style: const TextStyle(
                                    color: slate900,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                              Text(
                                note.timestamp,
                                style: const TextStyle(
                                  color: slate400,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            note.message,
                            style: const TextStyle(
                              color: slate700,
                              fontSize: 12,
                              height: 1.35,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildCloseAccount() {
    return Column(
      children: [
        _screenHeader(
          title: 'Shift Account Close-Out',
          subtitle: 'Daily Revenue Audit & Shift Reset',
          dark: true,
          onBack: () => setState(() => _screen = _CollectorScreen.dashboard),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 92),
            children: [
              _whitePanel(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Text(
                      'PAID VS UNPAID RATIO',
                      style: TextStyle(
                        color: slate400,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Center(
                      child: SizedBox(
                        width: 200,
                        height: 200,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 190,
                              height: 190,
                              child: CircularProgressIndicator(
                                value: 1.0,
                                strokeWidth: 16,
                                color: const Color(0xFFFFE4E6),
                                backgroundColor: const Color(0xFFFFE4E6),
                              ),
                            ),
                            SizedBox(
                              width: 190,
                              height: 190,
                              child: CircularProgressIndicator(
                                value: _paidPercent,
                                strokeWidth: 16,
                                color: emerald500,
                                backgroundColor: Colors.transparent,
                                strokeCap: StrokeCap.round,
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEFF6FF),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.account_balance_wallet_outlined,
                                    color: blue600,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'TOTAL SHIFT',
                                  style: TextStyle(
                                    color: slate400,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Rs. ${_totalShiftAmount.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    color: slate900,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: _paidPercent >= 1.0 ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '${(_paidPercent * 100).toStringAsFixed(0)}% Collected',
                                    style: TextStyle(
                                      color: _paidPercent >= 1.0 ? emerald600 : const Color(0xFFB45309),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _legend(
                            'Paid (${(_paidPercent * 100).toStringAsFixed(0)}%)',
                            emerald500),
                        const SizedBox(width: 24),
                        _legend(
                            'Unpaid (${((1 - _paidPercent) * 100).toStringAsFixed(0)}%)',
                            rose600),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _moneyBreakdownCard(
                      title: 'Paid Collections',
                      label: 'Total Cash',
                      amount: _todaysPaidSum,
                      count: '$_paidCount Paid Bills Today',
                      color: emerald600,
                      bg: const Color(0xFFECFDF5),
                      icon: Icons.verified_user_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _moneyBreakdownCard(
                      title: 'Unpaid Credit',
                      label: 'Total Credit',
                      amount: _todaysUnpaidSum,
                      count: '$_unpaidCount Unpaid Bills Today',
                      color: rose600,
                      bg: const Color(0xFFFFF1F2),
                      icon: Icons.error_outline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.verified_user_outlined,
                            color: blue600, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Permanent Database Protection',
                          style: TextStyle(
                            color: slate900,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Closing this shift will reset the active shift total to Rs. 0.00 for your next collection cycle. All customer meter readings and invoices remain permanently saved in the database!',
                      style: TextStyle(
                        color: Color(0xFF1E3A8A),
                        fontSize: 11,
                        height: 1.35,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _dangerGradientButton(
                text: 'Confirm Close Shift & Reset 0',
                icon: Icons.lock_outline,
                onTap: _closeShift,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _customerCard(Customer customer) {
    return InkWell(
      onTap: () => _selectCustomer(customer),
      child: _whitePanel(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        customer.fullName,
                        style: const TextStyle(
                          color: slate900,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      _inlineCodePill(customer.customerCode),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Meter #${customer.meterNumber ?? 'MTR-1001'} - ${customer.address}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: slate400,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Last Reading: ${_numberText(customer.lastMeterReading ?? 120)} L',
                    style: const TextStyle(
                      color: emerald600,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: blue600,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Bill',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _historyCard(Distribution item) {
    final paid = _isPaidStatus(item.paymentStatus);
    final expanded = _expandedBillId == item.id;
    return _whitePanel(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      borderColor: expanded ? blue600 : const Color(0xFFE2E8F0),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() {
              _expandedBillId = expanded ? null : item.id;
            }),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.customerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: slate900,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      _paidBadge(paid),
                      const SizedBox(width: 8),
                      _miniIcon(
                        expanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        expanded ? blue600 : slate500,
                        slate100,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${item.customerCode} - ${item.villageName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: slate500,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '#${item.receiptNumber ?? item.distributionCode}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: slate400,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                      const Text(
                        'Billed: ',
                        style: TextStyle(
                          color: slate400,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                        style: TextStyle(
                          color: paid ? emerald600 : rose600,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (expanded)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              color: const Color(0xFFF8FAFC),
              child: Column(
                children: [
                  Row(
                    children: [
                      _metricBox('Volume',
                          '${_numberText(item.quantityLitres)} L', slate900),
                      const SizedBox(width: 8),
                      _metricBox(
                        'Rate',
                        'Rs. ${item.pricePerLitre.toStringAsFixed(2)}/L',
                        blue600,
                      ),
                      const SizedBox(width: 8),
                      _metricBox(
                        'Billed',
                        'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                        paid ? emerald600 : rose600,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _whitePanel(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        _infoRow(
                          'Previous Reading:',
                          '${_numberText(item.previousMeterReading ?? 120)} L',
                        ),
                        _infoRow(
                          'Current Reading:',
                          '${_numberText(item.currentMeterReading ?? (120 + item.quantityLitres))} L',
                        ),
                        _infoRow(
                            'Date & Time:', _formatDate(item.distributionDate)),
                        _infoRow('Authorized Officer:', item.collectorName,
                            valueColor: blue600),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (!paid) ...[
                    _solidButton(
                      text:
                          'Pay Bill Now (Rs. ${item.totalAmount.toStringAsFixed(2)})',
                      icon: Icons.credit_card,
                      color: emerald600,
                      onTap: () => setState(() {
                        _settlingBill = item;
                        _settlePaymentMethod = _PaymentMethod.cash;
                        _settleReferenceController.clear();
                        _showSettlePaymentModal = true;
                      }),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: _solidButton(
                          text: 'WhatsApp PDF',
                          icon: Icons.share_outlined,
                          color: emerald600,
                          onTap: () => _copyReceiptText(item),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _solidButton(
                          text: 'View Invoice',
                          icon: Icons.visibility_outlined,
                          color: blue600,
                          onTap: () => setState(() {
                            _selectedInvoice = item;
                            _showInvoiceModal = true;
                          }),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLiveNotice() {
    return Positioned(
      top: 12,
      left: 12,
      right: 12,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: slate900,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0x662563EB)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x55000000),
              blurRadius: 18,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0x3334D399),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0x6634D399)),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                color: Color(0xFF34D399),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome,
                          color: Color(0xFFFBBF24), size: 13),
                      SizedBox(width: 5),
                      Text(
                        'LIVE ADMIN SYNC',
                        style: TextStyle(
                          color: Color(0xFF34D399),
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _adminPaymentNotice!,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: _dismissLiveBanner,
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: Colors.white10,
                  border: Border.all(color: Colors.white24),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white70, size: 17),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavigation() {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 8, 16, 8 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        boxShadow: [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 10,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _navButton(
            icon: Icons.home_outlined,
            label: 'Home',
            active: _screen == _CollectorScreen.dashboard,
            onTap: () => setState(() => _screen = _CollectorScreen.dashboard),
          ),
          _navButton(
            icon: Icons.speed_rounded,
            label: 'Billing',
            active: _screen == _CollectorScreen.search ||
                _screen == _CollectorScreen.record,
            onTap: () {
              _searchController.clear();
              _searchCustomers();
              setState(() => _screen = _CollectorScreen.search);
            },
          ),
          _navButton(
            icon: Icons.receipt_long_outlined,
            label: 'Receipts',
            active: _screen == _CollectorScreen.history ||
                _screen == _CollectorScreen.receipt,
            onTap: () => setState(() {
              _historyFilter = _HistoryFilter.all;
              _screen = _CollectorScreen.history;
            }),
          ),
          _navButton(
            icon: Icons.lock_outline,
            label: 'Close',
            active: _screen == _CollectorScreen.closeAccount,
            activeColor: rose600,
            onTap: () =>
                setState(() => _screen = _CollectorScreen.closeAccount),
          ),
        ],
      ),
    );
  }

  Widget _buildSlabsModal() {
    return _modalBarrier(
      child: _modalCard(
        maxHeight: 610,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _modalHeader(
              icon: Icons.pie_chart_outline,
              title: 'Active Water Price Tiers',
              subtitle: 'Configured Tariff Slabs',
              onClose: () => setState(() => _showSlabsModal = false),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: _tiersToUse.map((tier) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _blueTinyPill(tier.tierName),
                              const SizedBox(height: 7),
                              Text(
                                'Litres Range: ${_numberText(tier.minLitres)} L - ${tier.maxLitres != null ? '${_numberText(tier.maxLitres!)} L' : 'Unlimited (51+L)'}',
                                style: const TextStyle(
                                  color: slate700,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'Rate',
                              style: TextStyle(
                                color: slate400,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              'Rs. ${tier.pricePerLitre.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: emerald600,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                border: Border.all(color: const Color(0xFFDBEAFE)),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Whole-Volume Slab Rule: The total volume supplied is evaluated against these tiers. The matched tier rate applies to the entire volume billed.',
                style: TextStyle(
                  color: Color(0xFF1E40AF),
                  fontSize: 11,
                  height: 1.35,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 12),
            _darkButton(
              text: 'Close Tiers View',
              onTap: () => setState(() => _showSlabsModal = false),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoiceModal(Distribution item) {
    final paid = _isPaidStatus(item.paymentStatus);
    return _modalBarrier(
      child: _modalCard(
        maxHeight: 690,
        child: Column(
          children: [
            _modalHeader(
              icon: Icons.water_drop_outlined,
              title: 'AquaDistribute Utility Services',
              onClose: () => setState(() => _showInvoiceModal = false),
            ),
            Expanded(
              child: ListView(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'WATER BILL / INVOIS',
                              style: TextStyle(
                                color: slate900,
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              'Official Customer Invoice',
                              style: TextStyle(
                                color: slate500,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Bill No / No. Invois',
                            style: TextStyle(
                              color: slate400,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            item.receiptNumber ?? item.distributionCode,
                            style: const TextStyle(
                              color: blue600,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _invoiceGrid(item),
                  const SizedBox(height: 14),
                  _invoiceTable(
                    title: 'Billing Summary / Ringkasan Bil',
                    rows: [
                      ['Previous Balance', 'Rs. 0.00'],
                      [
                        'Current Usage Charge (${_numberText(item.quantityLitres)} L @ Rs. ${item.pricePerLitre.toStringAsFixed(2)}/L)',
                        'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                      ],
                      [
                        'TOTAL PAYABLE / JUMLAH PERLU DIBAYAR',
                        'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                      ],
                    ],
                    lastColor: paid ? emerald600 : rose600,
                  ),
                  const SizedBox(height: 14),
                  _invoiceTable(
                    title: 'Meter Readings / Butiran Meter',
                    rows: [
                      [
                        'Previous',
                        '${_numberText(item.previousMeterReading ?? 120)} L',
                      ],
                      [
                        'Current',
                        '${_numberText(item.currentMeterReading ?? (120 + item.quantityLitres))} L',
                      ],
                      [
                        'Consumption',
                        '${_numberText(item.quantityLitres)} Litres',
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: paid
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFFF1F2),
                      border: Border.all(
                        color: paid
                            ? const Color(0xFFA7F3D0)
                            : const Color(0xFFFECDD3),
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          paid
                              ? Icons.check_circle_outline
                              : Icons.error_outline,
                          color: paid ? emerald600 : rose600,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            paid
                                ? 'PAYMENT STATUS: PAID (CONFIRMED)'
                                : 'PAYMENT STATUS: UNPAID (PENDING CREDIT BILL)',
                            style: TextStyle(
                              color: paid ? emerald600 : rose600,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        _statusPill(paid ? 'OFFICIAL' : 'UNPAID',
                            paid ? emerald600 : rose600),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F9FF),
                      border: Border.all(color: const Color(0xFFBAE6FD)),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        _miniIcon(Icons.verified_user_outlined, Colors.white,
                            blue600),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Collector / Authorized Officer',
                                style: TextStyle(
                                  color: slate500,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                item.collectorName,
                                style: const TextStyle(
                                  color: Color(0xFF172554),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _blueTinyPill('VERIFIED'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _solidButton(
                    text: 'Share WhatsApp PDF',
                    icon: Icons.share_outlined,
                    color: emerald600,
                    onTap: () => _copyReceiptText(item),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _solidButton(
                    text: 'Copy Invoice',
                    icon: Icons.download_outlined,
                    color: blue600,
                    onTap: () => _copyReceiptText(item),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettlePaymentModal(Distribution item) {
    return _modalBarrier(
      child: _modalCard(
        maxHeight: 610,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _modalHeader(
              icon: Icons.credit_card,
              title: 'Collect Payment',
              subtitle: 'Field Collector Settlement',
              onClose: () => setState(() => _showSettlePaymentModal = false),
            ),
            _whitePanel(
              color: const Color(0xFFF8FAFC),
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _infoRow('Customer Name:', item.customerName),
                  _infoRow('Account / Code:', item.customerCode,
                      valueColor: blue600),
                  const Divider(height: 14),
                  _infoRow('Water Delivered:',
                      '${_numberText(item.quantityLitres)} Litres',
                      valueColor: const Color(0xFF1E3A8A)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                border: Border.all(color: const Color(0xFFA7F3D0)),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                children: [
                  const Text(
                    'TOTAL NET AMOUNT TO COLLECT',
                    style: TextStyle(
                      color: emerald600,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    'Rs. ${item.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Color(0xFF064E3B),
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Select Received Payment Method',
                style: TextStyle(
                  color: slate700,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 8),
            _paymentSelector(
              selected: _settlePaymentMethod,
              onChanged: (value) =>
                  setState(() => _settlePaymentMethod = value),
              cashLabel: 'CASH PAYMENT',
              onlineLabel: 'ONLINE / UPI',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _settleReferenceController,
              style: const TextStyle(
                color: slate900,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
              decoration: _lightInputDecoration(
                'Payment Note / Reference (Optional)',
              ),
            ),
            const SizedBox(height: 14),
            _gradientButton(
              text: _settleLoading
                  ? 'Processing Payment...'
                  : 'Confirm Payment (Rs. ${item.totalAmount.toStringAsFixed(2)})',
              icon: Icons.check_circle_outline,
              onTap: _settleLoading ? null : _confirmSettlePayment,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftSuccessModal() {
    return _modalBarrier(
      child: _modalCard(
        maxHeight: 310,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Color(0xFFD1FAE5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_outline,
                  color: emerald600, size: 40),
            ),
            const SizedBox(height: 16),
            const Text(
              'Shift Closed Successfully!',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: slate900,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Active shift counter reset to Rs. 0.00. All historical bills are safely stored in the database.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: slate500,
                fontSize: 12,
                height: 1.35,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            _solidButton(
              text: 'Start New Collection Shift',
              icon: Icons.play_arrow_rounded,
              color: blue600,
              onTap: () => setState(() => _showShiftCloseSuccessModal = false),
            ),
          ],
        ),
      ),
    );
  }

  Widget _screenHeader({
    required String title,
    String? subtitle,
    required VoidCallback onBack,
    Widget? trailing,
    bool dark = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: dark
              ? const [slate900, slate900, Color(0xFF172554)]
              : const [blue600, indigo600],
        ),
        border: dark ? const Border(bottom: BorderSide(color: slate800)) : null,
      ),
      child: Row(
        children: [
          InkWell(
            onTap: onBack,
            child: const Padding(
              padding: EdgeInsets.all(4),
              child: Icon(Icons.arrow_back, color: Colors.white, size: 22),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: slate400,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _whitePanel({
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(16),
    EdgeInsetsGeometry? margin,
    Color color = Colors.white,
    Color borderColor = const Color(0xFFE2E8F0),
  }) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _quickTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    Color? subtitleColor,
    String? badge,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: _whitePanel(
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: iconColor, size: 28),
                ),
                if (badge != null)
                  Positioned(
                    top: -4,
                    right: -5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: rose600,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        badge,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: slate900,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: subtitleColor ?? slate400,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _navButton({
    required IconData icon,
    required String label,
    required bool active,
    required VoidCallback onTap,
    Color activeColor = blue600,
  }) {
    final color = active ? activeColor : slate400;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _modalBarrier({required Widget child}) {
    return Positioned.fill(
      child: Container(
        color: slate900.withOpacity(0.82),
        padding: const EdgeInsets.all(16),
        child: Center(child: child),
      ),
    );
  }

  Widget _modalCard({required Widget child, required double maxHeight}) {
    final screenHeight = MediaQuery.of(context).size.height;
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(
        maxWidth: 500,
        maxHeight: (screenHeight * 0.85).clamp(200.0, maxHeight),
      ),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        boxShadow: const [
          BoxShadow(color: Color(0x55000000), blurRadius: 24),
        ],
      ),
      child: child,
    );
  }

  Widget _modalHeader({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onClose,
  }) {
    return Column(
      children: [
        Row(
          children: [
            _miniIcon(icon, emerald600, const Color(0xFFD1FAE5)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: slate900,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: slate400,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
            InkWell(
              onTap: onClose,
              child: _miniIcon(Icons.close, slate500, slate100),
            ),
          ],
        ),
        const Divider(height: 22),
      ],
    );
  }

  Widget _rateStat(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          maxLines: 2,
          style: const TextStyle(
            color: slate400,
            fontSize: 10,
            height: 1.35,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: valueColor,
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _circleIcon(IconData icon, Color iconColor, Color bgColor) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
      child: Icon(icon, color: iconColor, size: 24),
    );
  }

  Widget _roundHeaderButton({
    required IconData icon,
    required VoidCallback onTap,
    String? badge,
  }) {
    return InkWell(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: Colors.white24,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 18),
          ),
          if (badge != null)
            Positioned(
              top: -4,
              right: -4,
              child: Container(
                width: 18,
                height: 18,
                decoration: const BoxDecoration(
                  color: Color(0xFFFBBF24),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    badge,
                    style: const TextStyle(
                      color: slate900,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _squareIcon(IconData icon, Color color, Color bg) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }

  Widget _miniIcon(IconData icon, Color color, Color bg) {
    return Container(
      width: 31,
      height: 31,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 17),
    );
  }

  Widget _blueIconButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: blue600,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(color: Color(0x332563EB), blurRadius: 10),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  InputDecoration _lightInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: slate400,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: blue600),
      ),
    );
  }

  Widget _numberField({
    required String label,
    required TextEditingController controller,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: slate700,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(
            color: slate900,
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
          decoration: _lightInputDecoration(label),
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _segmentedControl({
    required String leftLabel,
    required String rightLabel,
    required bool leftSelected,
    required VoidCallback onLeft,
    required VoidCallback onRight,
  }) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          _segmentButton(leftLabel, leftSelected, onLeft),
          _segmentButton(rightLabel, !leftSelected, onRight),
        ],
      ),
    );
  }

  Widget _segmentButton(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: active ? blue600 : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: active ? Colors.white : slate500,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  Widget _paymentSelector({
    required _PaymentMethod selected,
    required ValueChanged<_PaymentMethod> onChanged,
    String cashLabel = 'CASH',
    String onlineLabel = 'ONLINE',
  }) {
    return Row(
      children: [
        Expanded(
          child: _paymentButton(
            cashLabel,
            selected == _PaymentMethod.cash,
            () => onChanged(_PaymentMethod.cash),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _paymentButton(
            onlineLabel,
            selected == _PaymentMethod.online,
            () => onChanged(_PaymentMethod.online),
          ),
        ),
      ],
    );
  }

  Widget _paymentButton(String label, bool active, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: active ? blue600 : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? blue600 : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: active ? Colors.white : slate700,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _darkCalcRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: slate400,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: valueColor,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _gradientButton({
    required String text,
    required IconData icon,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Opacity(
        opacity: onTap == null ? 0.55 : 1,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 15),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [blue600, indigo600]),
            borderRadius: BorderRadius.circular(18),
            boxShadow: const [
              BoxShadow(color: Color(0x332563EB), blurRadius: 14),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dangerGradientButton({
    required String text,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [rose600, Color(0xFFB91C1C)]),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(color: Color(0x33E11D48), blurRadius: 14),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 7),
            Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _outlinedDangerButton({
    required String text,
    required IconData icon,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Opacity(
        opacity: onTap == null ? 0.55 : 1,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            border: Border.all(color: const Color(0xFFFECDD3)),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: rose600, size: 17),
              const SizedBox(width: 7),
              Text(
                text,
                style: const TextStyle(
                  color: rose600,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _solidButton({
    required String text,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                text,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _darkButton({required String text, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: slate900,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: slate500,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: valueColor ?? slate900,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _receiptPassStat(
    String label,
    String value, {
    bool alignRight = false,
    Color valueColor = Colors.white,
  }) {
    return Column(
      crossAxisAlignment:
          alignRight ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Color(0xFFBFDBFE),
            fontSize: 10,
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: valueColor,
            fontSize: alignRight ? 17 : 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _filterButton(_HistoryFilter filter, String label) {
    final active = _historyFilter == filter;
    final activeColor = filter == _HistoryFilter.paid
        ? emerald600
        : filter == _HistoryFilter.unpaid
            ? rose600
            : blue600;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _historyFilter = filter),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: active ? activeColor : Colors.white,
            border: Border.all(
              color: active ? activeColor : const Color(0xFFE2E8F0),
            ),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: active ? Colors.white : activeColor,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  Widget _summaryLabel(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: color == Colors.white ? slate400 : color,
            fontSize: 10,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _emptyState({
    required String title,
    required String text,
    IconData icon = Icons.check_circle_outline,
  }) {
    return _whitePanel(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 38),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFD1FAE5)),
            ),
            child: Icon(icon, color: emerald600, size: 28),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: slate900,
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: slate500,
              fontSize: 12,
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _paidBadge(bool paid) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: paid ? const Color(0xFFECFDF5) : const Color(0xFFFFF1F2),
        border: Border.all(
          color: paid ? const Color(0xFFA7F3D0) : const Color(0xFFFECDD3),
        ),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            paid ? Icons.verified_user_outlined : Icons.error_outline,
            color: paid ? emerald600 : rose600,
            size: 13,
          ),
          const SizedBox(width: 3),
          Text(
            paid ? 'PAID' : 'UNPAID',
            style: TextStyle(
              color: paid ? emerald600 : rose600,
              fontSize: 10,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _metricBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Column(
          children: [
            Text(
              label.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: slate400,
                fontSize: 9,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _inlineCodePill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        border: Border.all(color: const Color(0xFFDBEAFE)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: blue600,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _statusPill(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _smallHeaderBadge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white24,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _blueTinyPill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFDBEAFE),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Color(0xFF1D4ED8),
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _invoiceGrid(Distribution item) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _invoiceTinyBlock(
              'Account Holder / Nama',
              item.customerName,
              item.customerCode,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _invoiceTinyBlock(
              'Premise / Address',
              item.villageName,
              'Date: ${_formatDate(item.distributionDate).split(' ').take(3).join(' ')}',
            ),
          ),
        ],
      ),
    );
  }

  Widget _invoiceTinyBlock(String label, String value, String sub) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: slate400,
            fontSize: 10,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: slate900,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          sub,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: slate500,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _invoiceTable({
    required String title,
    required List<List<String>> rows,
    Color? lastColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: slate900,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 7),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: rows.asMap().entries.map((entry) {
              final last = entry.key == rows.length - 1;
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                decoration: BoxDecoration(
                  color: last ? const Color(0xFFEFF6FF) : Colors.white,
                  border: entry.key == 0
                      ? null
                      : const Border(
                          top: BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                  borderRadius: BorderRadius.vertical(
                    top: entry.key == 0
                        ? const Radius.circular(14)
                        : Radius.zero,
                    bottom: last ? const Radius.circular(14) : Radius.zero,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.value[0],
                        style: TextStyle(
                          color: last ? const Color(0xFF1E3A8A) : slate700,
                          fontSize: 11,
                          fontWeight: last ? FontWeight.w900 : FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      entry.value[1],
                      style: TextStyle(
                        color: lastColor ?? slate900,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _legend(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _moneyBreakdownCard({
    required String title,
    required String label,
    required double amount,
    required String count,
    required Color color,
    required Color bg,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: color.withOpacity(0.24)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          Divider(color: color.withOpacity(0.2), height: 14),
          Text(
            label.toUpperCase(),
            style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            'Rs. ${amount.toStringAsFixed(2)}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color.withOpacity(0.95),
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            count,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}
