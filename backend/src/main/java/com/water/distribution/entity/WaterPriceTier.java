package com.water.distribution.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "water_price_tiers")
public class WaterPriceTier extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "water_price_id", nullable = false)
    @JsonIgnore
    private WaterPrice waterPrice;

    @Column(name = "tier_name", nullable = false, length = 100)
    private String tierName;

    @Column(name = "min_litres", nullable = false, precision = 10, scale = 2)
    private BigDecimal minLitres;

    @Column(name = "max_litres", precision = 10, scale = 2)
    private BigDecimal maxLitres; // NULL means unlimited / upper bound

    @Column(name = "price_per_litre", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerLitre;

    public WaterPriceTier() {}

    public WaterPriceTier(Long id, WaterPrice waterPrice, String tierName, BigDecimal minLitres, BigDecimal maxLitres, BigDecimal pricePerLitre) {
        this.id = id;
        this.waterPrice = waterPrice;
        this.tierName = tierName;
        this.minLitres = minLitres;
        this.maxLitres = maxLitres;
        this.pricePerLitre = pricePerLitre;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public WaterPrice getWaterPrice() { return waterPrice; }
    public void setWaterPrice(WaterPrice waterPrice) { this.waterPrice = waterPrice; }

    public String getTierName() { return tierName; }
    public void setTierName(String tierName) { this.tierName = tierName; }

    public BigDecimal getMinLitres() { return minLitres; }
    public void setMinLitres(BigDecimal minLitres) { this.minLitres = minLitres; }

    public BigDecimal getMaxLitres() { return maxLitres; }
    public void setMaxLitres(BigDecimal maxLitres) { this.maxLitres = maxLitres; }

    public BigDecimal getPricePerLitre() { return pricePerLitre; }
    public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }

    public static WaterPriceTierBuilder builder() { return new WaterPriceTierBuilder(); }

    public static class WaterPriceTierBuilder {
        private Long id;
        private WaterPrice waterPrice;
        private String tierName;
        private BigDecimal minLitres;
        private BigDecimal maxLitres;
        private BigDecimal pricePerLitre;

        public WaterPriceTierBuilder id(Long id) { this.id = id; return this; }
        public WaterPriceTierBuilder waterPrice(WaterPrice waterPrice) { this.waterPrice = waterPrice; return this; }
        public WaterPriceTierBuilder tierName(String tierName) { this.tierName = tierName; return this; }
        public WaterPriceTierBuilder minLitres(BigDecimal minLitres) { this.minLitres = minLitres; return this; }
        public WaterPriceTierBuilder maxLitres(BigDecimal maxLitres) { this.maxLitres = maxLitres; return this; }
        public WaterPriceTierBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }

        public WaterPriceTier build() {
            return new WaterPriceTier(id, waterPrice, tierName, minLitres, maxLitres, pricePerLitre);
        }
    }
}
