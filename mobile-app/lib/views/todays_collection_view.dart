import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/distribution_provider.dart';

class TodaysCollectionView extends StatefulWidget {
  const TodaysCollectionView({Key? key}) : super(key: key);

  @override
  State<TodaysCollectionView> createState() => _TodaysCollectionViewState();
}

class _TodaysCollectionViewState extends State<TodaysCollectionView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DistributionProvider>(context, listen: false).fetchTodaysCollection();
    });
  }

  @override
  Widget build(BuildContext context) {
    final distProvider = Provider.of<DistributionProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Today\'s Collections')),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF0284C7)),
              ),
              child: Column(
                children: [
                  const Text('TOTAL COLLECTED TODAY', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Text(
                    'Rs. ${distProvider.todaysCollection.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                  ),
                  const SizedBox(height: 8),
                  const Text('Direct backend database aggregate', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
