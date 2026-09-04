import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:water_distribution_mobile/main.dart';

void main() {
  testWidgets('Water Distribution App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const WaterDistributionApp());

    // Verify MaterialApp builds without error
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
