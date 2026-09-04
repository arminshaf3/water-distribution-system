import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/customer_provider.dart';
import 'providers/distribution_provider.dart';
import 'views/splash_view.dart';
import 'views/login_view.dart';
import 'views/home_view.dart';
import 'views/customer_search_view.dart';
import 'views/new_customer_view.dart';
import 'views/todays_collection_view.dart';
import 'views/profile_view.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WaterDistributionApp());
}

class WaterDistributionApp extends StatelessWidget {
  const WaterDistributionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CustomerProvider()),
        ChangeNotifierProvider(create: (_) => DistributionProvider()),
      ],
      child: MaterialApp(
        title: 'Water Distribution Collector',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        initialRoute: '/splash',
        routes: {
          '/splash': (context) => const SplashView(),
          '/login': (context) => const LoginView(),
          '/home': (context) => const HomeView(),
          '/search_customer': (context) => const CustomerSearchView(),
          '/new_customer': (context) => const NewCustomerView(),
          '/todays_collection': (context) => const TodaysCollectionView(),
          '/profile': (context) => const ProfileView(),
        },
      ),
    );
  }
}
