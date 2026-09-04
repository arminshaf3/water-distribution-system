import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/distribution.dart';
import '../providers/distribution_provider.dart';
import 'receipt_view.dart';

class PaymentView extends StatefulWidget {
  final Distribution distribution;

  const PaymentView({Key? key, required this.distribution}) : super(key: key);

  @override
  State<PaymentView> createState() => _PaymentViewState();
}

class _PaymentViewState extends State<PaymentView> {
  String _paymentMethod = 'CASH';
  final _refController = TextEditingController();

  void _handlePayment() async {
    final distProvider = Provider.of<DistributionProvider>(context, listen: false);
    try {
      final receipt = await distProvider.recordPayment(
        distributionId: widget.distribution.id,
        paymentMethod: _paymentMethod,
        referenceNumber: _refController.text.trim().isNotEmpty ? _refController.text.trim() : null,
      );

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ReceiptView(receipt: receipt),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment Failed: ${e.toString().replaceAll('Exception: ', '')}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final distProvider = Provider.of<DistributionProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Collect Payment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Bill Summary
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  const Text('TOTAL AMOUNT DUE', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    'Rs. ${widget.distribution.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                  ),
                  const Divider(color: Color(0xFF334155), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Customer:', style: TextStyle(color: Color(0xFF94A3B8))),
                      Text(widget.distribution.customerName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Volume Supplied:', style: TextStyle(color: Color(0xFF94A3B8))),
                      Text('${widget.distribution.quantityLitres} Litres', style: const TextStyle(color: Colors.white)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('CASH', style: TextStyle(fontWeight: FontWeight.bold))),
                    selected: _paymentMethod == 'CASH',
                    onSelected: (sel) {
                      if (sel) setState(() => _paymentMethod = 'CASH');
                    },
                    selectedColor: const Color(0xFF0284C7),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('ONLINE', style: TextStyle(fontWeight: FontWeight.bold))),
                    selected: _paymentMethod == 'ONLINE',
                    onSelected: (sel) {
                      if (sel) setState(() => _paymentMethod = 'ONLINE');
                    },
                    selectedColor: const Color(0xFF0284C7),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (_paymentMethod == 'ONLINE') ...[
              const Text('Reference / Transaction ID', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),
              TextField(
                controller: _refController,
                decoration: const InputDecoration(
                  hintText: 'Enter UPI / Bank Txn Ref #',
                  prefixIcon: Icon(Icons.numbers),
                ),
              ),
              const SizedBox(height: 20),
            ],

            ElevatedButton(
              onPressed: distProvider.isLoading ? null : _handlePayment,
              child: distProvider.isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Confirm Payment & Generate Receipt'),
            )
          ],
        ),
      ),
    );
  }
}
