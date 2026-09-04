import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/distribution.dart';
import '../config/app_theme.dart';

class TransactionDetailView extends StatelessWidget {
  final Distribution distribution;

  const TransactionDetailView({
    super.key,
    required this.distribution,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormatter =
        NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 2);
    final dateFormatter = DateFormat('yyyy-MM-dd HH:mm');
    final distributionDate = DateTime.tryParse(distribution.distributionDate);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Transaction Details'),
        backgroundColor: AppTheme.surfaceColor,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: distribution.paymentStatus == 'PAID'
                      ? AppTheme.successColor.withOpacity(0.3)
                      : AppTheme.warningColor.withOpacity(0.3),
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    distribution.paymentStatus == 'PAID'
                        ? Icons.check_circle_rounded
                        : Icons.pending_actions_rounded,
                    size: 56,
                    color: distribution.paymentStatus == 'PAID'
                        ? AppTheme.successColor
                        : AppTheme.warningColor,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    distribution.paymentStatus == 'PAID'
                        ? 'PAYMENT COMPLETED'
                        : 'PAYMENT PENDING',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: distribution.paymentStatus == 'PAID'
                          ? AppTheme.successColor
                          : AppTheme.warningColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    currencyFormatter.format(distribution.totalAmount),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Distribution Info Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TRANSACTION DETAILS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textSecondaryColor,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Divider(color: Colors.white10, height: 24),
                  _buildRow('Transaction Code', distribution.distributionCode),
                  _buildRow('Customer Name', distribution.customerName),
                  _buildRow('Customer Code', distribution.customerCode),
                  _buildRow('Village / Area', distribution.villageName),
                  _buildRow('Quantity Supplied',
                      '${distribution.quantityLitres.toStringAsFixed(1)} Litres'),
                  _buildRow('Price Rate Locked',
                      'Rs. ${distribution.pricePerLitre.toStringAsFixed(2)} / L'),
                  _buildRow('Collector Staff', distribution.collectorName),
                  _buildRow(
                    'Timestamp',
                    distributionDate != null
                        ? dateFormatter.format(distributionDate)
                        : distribution.distributionDate,
                  ),
                  if (distribution.receiptNumber != null)
                    _buildRow('Receipt Number', distribution.receiptNumber!),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondaryColor,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
