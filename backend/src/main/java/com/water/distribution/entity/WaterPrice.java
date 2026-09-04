package com.water.distribution.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_prices")
public class WaterPrice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "price_per_litre", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerLitre;

    @Column(name = "effective_from", nullable = false)
    private LocalDateTime effectiveFrom;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(length = 255)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "waterPrice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("minLitres ASC")
    private java.util.List<WaterPriceTier> tiers = new java.util.ArrayList<>();

    public WaterPrice() {}

    public WaterPrice(Long id, BigDecimal pricePerLitre, LocalDateTime effectiveFrom, Boolean isActive, String notes, User createdBy) {
        this.id = id;
        this.pricePerLitre = pricePerLitre;
        this.effectiveFrom = effectiveFrom;
        this.isActive = isActive != null ? isActive : true;
        this.notes = notes;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getPricePerLitre() { return pricePerLitre; }
    public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }

    public LocalDateTime getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getStatus() { return Boolean.TRUE.equals(isActive) ? "ACTIVE" : "INACTIVE"; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public java.util.List<WaterPriceTier> getTiers() { return tiers; }
    public void setTiers(java.util.List<WaterPriceTier> tiers) { this.tiers = tiers; }

    public static WaterPriceBuilder builder() { return new WaterPriceBuilder(); }

    public static class WaterPriceBuilder {
        private Long id;
        private BigDecimal pricePerLitre;
        private LocalDateTime effectiveFrom;
        private Boolean isActive = true;
        private String notes;
        private User createdBy;

        public WaterPriceBuilder id(Long id) { this.id = id; return this; }
        public WaterPriceBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }
        public WaterPriceBuilder effectiveFrom(LocalDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; return this; }
        public WaterPriceBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public WaterPriceBuilder notes(String notes) { this.notes = notes; return this; }
        public WaterPriceBuilder createdBy(User createdBy) { this.createdBy = createdBy; return this; }

        public WaterPrice build() {
            return new WaterPrice(id, pricePerLitre, effectiveFrom, isActive, notes, createdBy);
        }
    }
}
