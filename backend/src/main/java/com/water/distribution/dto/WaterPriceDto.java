package com.water.distribution.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class WaterPriceDto {
    private Long id;

    @NotNull(message = "Price per litre is required")
    @DecimalMin(value = "0.01", message = "Price per litre must be greater than zero")
    private BigDecimal pricePerLitre;

    private LocalDateTime effectiveFrom;
    private Boolean isActive;
    private String notes;
    private String createdByName;
    private LocalDateTime createdAt;

    private List<PriceTierDto> tiers;

    public WaterPriceDto() {}

    public WaterPriceDto(Long id, BigDecimal pricePerLitre, LocalDateTime effectiveFrom, Boolean isActive, String notes, String createdByName, LocalDateTime createdAt, List<PriceTierDto> tiers) {
        this.id = id;
        this.pricePerLitre = pricePerLitre;
        this.effectiveFrom = effectiveFrom;
        this.isActive = isActive;
        this.notes = notes;
        this.createdByName = createdByName;
        this.createdAt = createdAt;
        this.tiers = tiers;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getPricePerLitre() { return pricePerLitre; }
    public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }

    public LocalDateTime getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<PriceTierDto> getTiers() { return tiers; }
    public void setTiers(List<PriceTierDto> tiers) { this.tiers = tiers; }

    public static class PriceTierDto {
        private String tierName;
        private BigDecimal minLitres;
        private BigDecimal maxLitres;
        private BigDecimal pricePerLitre;

        public PriceTierDto() {}

        public PriceTierDto(String tierName, BigDecimal minLitres, BigDecimal maxLitres, BigDecimal pricePerLitre) {
            this.tierName = tierName;
            this.minLitres = minLitres;
            this.maxLitres = maxLitres;
            this.pricePerLitre = pricePerLitre;
        }

        public String getTierName() { return tierName; }
        public void setTierName(String tierName) { this.tierName = tierName; }

        public BigDecimal getMinLitres() { return minLitres; }
        public void setMinLitres(BigDecimal minLitres) { this.minLitres = minLitres; }

        public BigDecimal getMaxLitres() { return maxLitres; }
        public void setMaxLitres(BigDecimal maxLitres) { this.maxLitres = maxLitres; }

        public BigDecimal getPricePerLitre() { return pricePerLitre; }
        public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }
    }

    public static WaterPriceDtoBuilder builder() { return new WaterPriceDtoBuilder(); }

    public static class WaterPriceDtoBuilder {
        private Long id;
        private BigDecimal pricePerLitre;
        private LocalDateTime effectiveFrom;
        private Boolean isActive;
        private String notes;
        private String createdByName;
        private LocalDateTime createdAt;
        private List<PriceTierDto> tiers;

        public WaterPriceDtoBuilder id(Long id) { this.id = id; return this; }
        public WaterPriceDtoBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }
        public WaterPriceDtoBuilder effectiveFrom(LocalDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; return this; }
        public WaterPriceDtoBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public WaterPriceDtoBuilder notes(String notes) { this.notes = notes; return this; }
        public WaterPriceDtoBuilder createdByName(String createdByName) { this.createdByName = createdByName; return this; }
        public WaterPriceDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public WaterPriceDtoBuilder tiers(List<PriceTierDto> tiers) { this.tiers = tiers; return this; }

        public WaterPriceDto build() {
            return new WaterPriceDto(id, pricePerLitre, effectiveFrom, isActive, notes, createdByName, createdAt, tiers);
        }
    }
}
