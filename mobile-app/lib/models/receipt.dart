class Receipt {
  final int id;
  final String receiptNumber;
  final String customerCode;
  final String customerName;
  final String customerAddress;
  final String customerPhone;
  final String villageName;
  final double quantityLitres;
  final double pricePerLitre;
  final double totalAmount;
  final String paymentMethod;
  final String? referenceNumber;
  final String collectorName;
  final String issuedAt;

  Receipt({
    required this.id,
    required this.receiptNumber,
    required this.customerCode,
    required this.customerName,
    required this.customerAddress,
    required this.customerPhone,
    required this.villageName,
    required this.quantityLitres,
    required this.pricePerLitre,
    required this.totalAmount,
    required this.paymentMethod,
    this.referenceNumber,
    required this.collectorName,
    required this.issuedAt,
  });

  factory Receipt.fromJson(Map<String, dynamic> json) {
    return Receipt(
      id: json['id'] ?? 0,
      receiptNumber: json['receiptNumber'] ?? '',
      customerCode: json['customerCode'] ?? '',
      customerName: json['customerName'] ?? '',
      customerAddress: json['customerAddress'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      villageName: json['villageName'] ?? '',
      quantityLitres: (json['quantityLitres'] as num?)?.toDouble() ?? 0.0,
      pricePerLitre: (json['pricePerLitre'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? 'CASH',
      referenceNumber: json['referenceNumber'],
      collectorName: json['collectorName'] ?? '',
      issuedAt: json['issuedAt'] ?? '',
    );
  }
}
