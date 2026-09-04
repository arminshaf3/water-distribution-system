import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/customer.dart';
import '../providers/distribution_provider.dart';
import 'payment_view.dart';

class RecordDistributionView extends StatefulWidget {
  final Customer customer;

  const RecordDistributionView({Key? key, required this.customer})
      : super(key: key);

  @override
  State<RecordDistributionView> createState() => _RecordDistributionViewState();
}

class _RecordDistributionViewState extends State<RecordDistributionView> {
  final _prevReadingController = TextEditingController(text: '120');
  final _currReadingController = TextEditingController(text: '160');
  final _directQuantityController = TextEditingController(text: '40');

  bool _isMeterMode = true;
  double _computedLitres = 40.0;
  double _appliedRate = 5.0;
  double _calculatedTotal = 200.0;
  String _matchingSlabName = 'Base Rate';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _recalculateTotal();
    });
  }

  void _recalculateTotal() {
    final distProvider =
        Provider.of<DistributionProvider>(context, listen: false);
    final activePrice = distProvider.activePrice;

    double qty = 0.0;
    if (_isMeterMode) {
      final prev = double.tryParse(_prevReadingController.text.trim()) ?? 0.0;
      final curr = double.tryParse(_currReadingController.text.trim()) ?? 0.0;
      qty = curr >= prev ? (curr - prev) : 0.0;
    } else {
      qty = double.tryParse(_directQuantityController.text.trim()) ?? 0.0;
    }

    double rate =
        activePrice != null ? activePrice.getMatchingSlabRate(qty) : 5.0;
    String slabName = 'Base Rate';

    if (activePrice != null && activePrice.tiers.isNotEmpty) {
      for (var t in activePrice.tiers) {
        if (qty >= t.minLitres &&
            (t.maxLitres == null || qty <= t.maxLitres!)) {
          slabName = t.tierName;
          break;
        }
      }
    }

    setState(() {
      _computedLitres = qty;
      _appliedRate = rate;
      _calculatedTotal = qty * rate;
      _matchingSlabName = slabName;
    });
  }

  void _handleRecord() async {
    if (_computedLitres <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Please enter valid meter readings or litres volume')),
      );
      return;
    }

    final distProvider =
        Provider.of<DistributionProvider>(context, listen: false);
    try {
      final distribution = await distProvider.recordDistribution(
        customerId: widget.customer.id,
        quantityLitres: _computedLitres,
      );

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => PaymentView(distribution: distribution),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text('Failed: ${e.toString().replaceAll('Exception: ', '')}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final distProvider = Provider.of<DistributionProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Meter & Supply'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Household Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.home_work,
                      color: Color(0xFF0284C7), size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.customer.fullName,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.white),
                        ),
                        Text(
                          'Meter #${null ?? "MTR-1001"} • ${widget.customer.villageName}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Mode Selector
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Household Meter Reading')),
                    selected: _isMeterMode,
                    onSelected: (val) {
                      setState(() {
                        _isMeterMode = true;
                      });
                      _recalculateTotal();
                    },
                    selectedColor: const Color(0xFF0284C7),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _isMeterMode ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Direct Volume (L)')),
                    selected: !_isMeterMode,
                    onSelected: (val) {
                      setState(() {
                        _isMeterMode = false;
                      });
                      _recalculateTotal();
                    },
                    selectedColor: const Color(0xFF0284C7),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: !_isMeterMode ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Inputs
            if (_isMeterMode) ...[
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Previous Meter Reading',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 12)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _prevReadingController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          onChanged: (_) => _recalculateTotal(),
                          decoration: const InputDecoration(
                            hintText: '120',
                            prefixIcon: Icon(Icons.speed),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Current Meter Reading',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 12)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _currReadingController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          onChanged: (_) => _recalculateTotal(),
                          decoration: const InputDecoration(
                            hintText: '160',
                            prefixIcon: Icon(Icons.speed),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ] else ...[
              const Text('Quantity Distributed (Litres)',
                  style: TextStyle(
                      fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 6),
              TextField(
                controller: _directQuantityController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _recalculateTotal(),
                decoration: const InputDecoration(
                  hintText: 'e.g. 40',
                  suffixText: 'Litres',
                  prefixIcon: Icon(Icons.water_drop_outlined),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Applied Slab Badge
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: const Color(0xFF0284C7).withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Volume Consumed:',
                          style:
                              TextStyle(color: Colors.grey[400], fontSize: 13)),
                      Text('${_computedLitres.toStringAsFixed(1)} Litres',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              fontSize: 14)),
                    ],
                  ),
                  const Divider(color: Color(0xFF334155), height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Matching Admin Slab:',
                          style:
                              TextStyle(color: Colors.grey[400], fontSize: 13)),
                      Text(_matchingSlabName,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF38BDF8),
                              fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Whole-Volume Slab Rate:',
                          style:
                              TextStyle(color: Colors.grey[400], fontSize: 13)),
                      Text('Rs. ${_appliedRate.toStringAsFixed(2)} / L',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF34D399),
                              fontSize: 15)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // System Computed Total Box
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981), width: 1.5),
              ),
              child: Column(
                children: [
                  const Text(
                    'TOTAL BILLED AMOUNT',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                        letterSpacing: 1.1),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Rs. ${_calculatedTotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '(${_computedLitres.toStringAsFixed(1)} L × Rs. ${_appliedRate.toStringAsFixed(2)}/L)',
                    style:
                        const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              onPressed: distProvider.isLoading ? null : _handleRecord,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: distProvider.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Proceed to Print Receipt & Collect',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            )
          ],
        ),
      ),
    );
  }
}
