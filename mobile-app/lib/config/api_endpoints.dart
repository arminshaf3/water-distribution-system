class ApiEndpoints {
  // Configured to point directly to the live Cloud Backend
  // Override if needed with: --dart-define=API_BASE_URL=https://<your-cloud-url>/api/v1
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://stage-acne-dame-auctions.trycloudflare.com/api/v1',
  );

  static const String login = '$baseUrl/auth/login';
  static const String currentUser = '$baseUrl/auth/me';

  static const String customers = '$baseUrl/customers';
  static const String customerSearch = '$baseUrl/customers';
  static const String customerByCode = '$baseUrl/customers/code';

  static const String activePrice = '$baseUrl/water-prices/active';

  static const String distributions = '$baseUrl/distributions';
  static const String myDistributions = '$baseUrl/distributions/my-history';

  static const String payments = '$baseUrl/payments';
  static const String todaysCollection = '$baseUrl/payments/today';
  static const String receipts = '$baseUrl/receipts';

  static const String villages = '$baseUrl/villages';
}
