class Customer {
  final int id;
  final String customerCode;
  final String fullName;
  final String phoneNumber;
  final String address;
  final int villageId;
  final String villageName;
  final String? meterNumber;
  final double? lastMeterReading;
  final String status;

  Customer({
    required this.id,
    required this.customerCode,
    required this.fullName,
    required this.phoneNumber,
    required this.address,
    required this.villageId,
    required this.villageName,
    this.meterNumber,
    this.lastMeterReading,
    required this.status,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      customerCode: json['customerCode'] ?? '',
      fullName: json['fullName'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      address: json['address'] ?? '',
      villageId: json['villageId'] ?? 0,
      villageName: json['villageName'] ?? '',
      meterNumber: json['meterNumber'],
      lastMeterReading: (json['lastMeterReading'] as num?)?.toDouble(),
      status: json['status'] ?? 'ACTIVE',
    );
  }

  Customer copyWith({
    String? meterNumber,
    double? lastMeterReading,
  }) {
    return Customer(
      id: id,
      customerCode: customerCode,
      fullName: fullName,
      phoneNumber: phoneNumber,
      address: address,
      villageId: villageId,
      villageName: villageName,
      meterNumber: meterNumber ?? this.meterNumber,
      lastMeterReading: lastMeterReading ?? this.lastMeterReading,
      status: status,
    );
  }
}
