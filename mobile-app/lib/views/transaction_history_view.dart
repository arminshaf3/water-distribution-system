import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/distribution_provider.dart';

class TransactionHistoryView extends StatefulWidget {
  const TransactionHistoryView({Key? key}) : super(key: key);

  @override
  State<TransactionHistoryView> createState() => _TransactionHistoryViewState();
}

class _TransactionHistoryViewState extends State<TransactionHistoryView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DistributionProvider>(context, listen: false).fetchMyHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final distProvider = Provider.of<DistributionProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('My Transaction History')),
      body: distProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : distProvider.myDistributions.isEmpty
              ? const Center(child: Text('No recorded distributions found.', style: TextStyle(color: Color(0xFF94A3B8))))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: distProvider.myDistributions.length,
                  itemBuilder: (context, index) {
                    final dist = distProvider.myDistributions[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(dist.customerName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        subtitle: Text(
                          '${dist.quantityLitres} L • Rs. ${dist.pricePerLitre}/L • ${dist.paymentStatus}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                        trailing: Text(
                          'Rs. ${dist.totalAmount.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: dist.paymentStatus == 'PAID' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
