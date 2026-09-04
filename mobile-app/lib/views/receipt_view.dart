import 'package:flutter/material.dart';
import '../models/receipt.dart';
import 'home_view.dart';

class ReceiptView extends StatelessWidget {
  final Receipt receipt;

  const ReceiptView({Key? key, required this.receipt}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Receipt'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const HomeView()),
                (route) => false,
              );
            },
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      const Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 64),
                      const SizedBox(height: 12),
                      const Text(
                        'WATER PAYMENT RECEIPT',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.1),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        receipt.receiptNumber,
                        style: const TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const Divider(color: Color(0xFF334155), height: 32),

                      _buildReceiptRow('Customer Name', receipt.customerName),
                      _buildReceiptRow('Customer Code', receipt.customerCode),
                      _buildReceiptRow('Village Sector', receipt.villageName),
                      _buildReceiptRow('Phone Number', receipt.customerPhone),
                      const Divider(color: Color(0xFF334155), height: 24),

                      _buildReceiptRow('Quantity Litres', '${receipt.quantityLitres} L'),
                      _buildReceiptRow('Price per Litre', 'Rs. ${receipt.pricePerLitre.toStringAsFixed(2)}'),
                      _buildReceiptRow('Payment Method', receipt.paymentMethod),
                      const Divider(color: Color(0xFF334155), height: 24),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Amount Paid', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                          Text(
                            'Rs. ${receipt.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF10B981)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const HomeView()),
                    (route) => false,
                  );
                },
                child: const Text('Back to Home'),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
