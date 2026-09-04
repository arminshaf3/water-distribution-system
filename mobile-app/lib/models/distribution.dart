class Distribution {
  final int id;
  final String distributionCode;
  final int customerId;
  final String customerCode;
  final String customerName;
  final String customerPhone;
  final String villageName;
  final int collectorId;
  final String collectorName;
  final double quantityLitres;
  final double pricePerLitre;
  final double totalAmount;
  final double? previousMeterReading;
  final double? currentMeterReading;
  final String distributionDate;
  final String paymentStatus;
  final String? receiptNumber;
  final String? paymentMethod;

  Distribution({
    required this.id,
    required this.distributionCode,
    required this.customerId,
    required this.customerCode,
    required this.customerName,
    required this.customerPhone,
    required this.villageName,
    required this.collectorId,
    required this.collectorName,
    required this.quantityLitres,
    required this.pricePerLitre,
    required this.totalAmount,
    this.previousMeterReading,
    this.currentMeterReading,
    required this.distributionDate,
    required this.paymentStatus,
    this.receiptNumber,
    this.paymentMethod,
  });

  factory Distribution.fromJson(Map<String, dynamic> json) {
    return Distribution(
      id: json['id'] ?? 0,
      distributionCode: json['distributionCode'] ?? '',
      customerId: json['customerId'] ?? 0,
      customerCode: json['customerCode'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      villageName: json['villageName'] ?? '',
      collectorId: json['collectorId'] ?? 0,
      collectorName: json['collectorName'] ?? 'John Collector',
      quantityLitres: (json['quantityLitres'] as num?)?.toDouble() ?? 0.0,
      pricePerLitre: (json['pricePerLitre'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      previousMeterReading: (json['previousMeterReading'] as num?)?.toDouble(),
      currentMeterReading: (json['currentMeterReading'] as num?)?.toDouble(),
      distributionDate: json['distributionDate'] ?? '',
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      receiptNumber: json['receiptNumber'],
      paymentMethod: json['paymentMethod'],
    );
  }

  Distribution copyWith({
    String? paymentStatus,
    String? receiptNumber,
    String? paymentMethod,
    double? previousMeterReading,
    double? currentMeterReading,
  }) {
    return Distribution(
      id: id,
      distributionCode: distributionCode,
      customerId: customerId,
      customerCode: customerCode,
      customerName: customerName,
      customerPhone: customerPhone,
      villageName: villageName,
      collectorId: collectorId,
      collectorName: collectorName,
      quantityLitres: quantityLitres,
      pricePerLitre: pricePerLitre,
      totalAmount: totalAmount,
      previousMeterReading: previousMeterReading ?? this.previousMeterReading,
      currentMeterReading: currentMeterReading ?? this.currentMeterReading,
      distributionDate: distributionDate,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      receiptNumber: receiptNumber ?? this.receiptNumber,
      paymentMethod: paymentMethod ?? this.paymentMethod,
    );
  }
}
