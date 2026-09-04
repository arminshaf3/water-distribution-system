package com.water.distribution.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_distributions")
public class WaterDistribution extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "distribution_code", nullable = false, unique = true, length = 50)
    private String distributionCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "collector_id", nullable = false)
    private User collector;

    @Column(name = "quantity_litres", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityLitres;

    @Column(name = "price_per_litre", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerLitre;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "distribution_date", nullable = false)
    private LocalDateTime distributionDate;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = "PENDING"; // PENDING, PAID

    @OneToOne(mappedBy = "distribution", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Payment payment;

    public WaterDistribution() {}

    public WaterDistribution(Long id, String distributionCode, Customer customer, User collector, BigDecimal quantityLitres, BigDecimal pricePerLitre, BigDecimal totalAmount, LocalDateTime distributionDate, String paymentStatus, Payment payment) {
        this.id = id;
        this.distributionCode = distributionCode;
        this.customer = customer;
        this.collector = collector;
        this.quantityLitres = quantityLitres;
        this.pricePerLitre = pricePerLitre;
        this.totalAmount = totalAmount;
        this.distributionDate = distributionDate;
        this.paymentStatus = paymentStatus != null ? paymentStatus : "PENDING";
        this.payment = payment;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDistributionCode() { return distributionCode; }
    public void setDistributionCode(String distributionCode) { this.distributionCode = distributionCode; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public User getCollector() { return collector; }
    public void setCollector(User collector) { this.collector = collector; }

    public BigDecimal getQuantityLitres() { return quantityLitres; }
    public void setQuantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; }

    public BigDecimal getPricePerLitre() { return pricePerLitre; }
    public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getDistributionDate() { return distributionDate; }
    public void setDistributionDate(LocalDateTime distributionDate) { this.distributionDate = distributionDate; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public static WaterDistributionBuilder builder() { return new WaterDistributionBuilder(); }

    public static class WaterDistributionBuilder {
        private Long id;
        private String distributionCode;
        private Customer customer;
        private User collector;
        private BigDecimal quantityLitres;
        private BigDecimal pricePerLitre;
        private BigDecimal totalAmount;
        private LocalDateTime distributionDate;
        private String paymentStatus = "PENDING";
        private Payment payment;

        public WaterDistributionBuilder id(Long id) { this.id = id; return this; }
        public WaterDistributionBuilder distributionCode(String distributionCode) { this.distributionCode = distributionCode; return this; }
        public WaterDistributionBuilder customer(Customer customer) { this.customer = customer; return this; }
        public WaterDistributionBuilder collector(User collector) { this.collector = collector; return this; }
        public WaterDistributionBuilder quantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; return this; }
        public WaterDistributionBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }
        public WaterDistributionBuilder totalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; return this; }
        public WaterDistributionBuilder distributionDate(LocalDateTime distributionDate) { this.distributionDate = distributionDate; return this; }
        public WaterDistributionBuilder paymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; return this; }
        public WaterDistributionBuilder payment(Payment payment) { this.payment = payment; return this; }

        public WaterDistribution build() {
            return new WaterDistribution(id, distributionCode, customer, collector, quantityLitres, pricePerLitre, totalAmount, distributionDate, paymentStatus, payment);
        }
    }
}
