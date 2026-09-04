class WaterPriceTier {
  final String tierName;
  final double minLitres;
  final double? maxLitres;
  final double pricePerLitre;

  WaterPriceTier({
    required this.tierName,
    required this.minLitres,
    this.maxLitres,
    required this.pricePerLitre,
  });

  factory WaterPriceTier.fromJson(Map<String, dynamic> json) {
    return WaterPriceTier(
      tierName: json['tierName'] ?? 'Slab Rate',
      minLitres: (json['minLitres'] as num?)?.toDouble() ?? 0.0,
      maxLitres: json['maxLitres'] != null ? (json['maxLitres'] as num).toDouble() : null,
      pricePerLitre: (json['pricePerLitre'] as num?)?.toDouble() ?? 5.0,
    );
  }
}

class WaterPrice {
  final int id;
  final double pricePerLitre;
  final String effectiveFrom;
  final bool isActive;
  final List<WaterPriceTier> tiers;

  WaterPrice({
    required this.id,
    required this.pricePerLitre,
    required this.effectiveFrom,
    required this.isActive,
    required this.tiers,
  });

  factory WaterPrice.fromJson(Map<String, dynamic> json) {
    List<WaterPriceTier> parsedTiers = [];
    if (json['tiers'] != null && json['tiers'] is List) {
      parsedTiers = (json['tiers'] as List)
          .map((t) => WaterPriceTier.fromJson(t as Map<String, dynamic>))
          .toList();
    }

    return WaterPrice(
      id: json['id'] ?? 0,
      pricePerLitre: (json['pricePerLitre'] as num?)?.toDouble() ?? 5.0,
      effectiveFrom: json['effectiveFrom'] ?? '',
      isActive: json['isActive'] ?? true,
      tiers: parsedTiers,
    );
  }

  // Calculate Whole-Volume Slab Rate based on Litres
  double getMatchingSlabRate(double quantityLitres) {
    if (tiers.isEmpty) return pricePerLitre;
    for (var tier in tiers) {
      if (quantityLitres >= tier.minLitres &&
          (tier.maxLitres == null || quantityLitres <= tier.maxLitres!)) {
        return tier.pricePerLitre;
      }
    }
    return pricePerLitre;
  }
}
