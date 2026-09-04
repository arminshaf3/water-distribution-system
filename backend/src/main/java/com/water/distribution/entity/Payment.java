package com.water.distribution.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "distribution_id", nullable = false, unique = true)
    private WaterDistribution distribution;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod; // CASH, ONLINE

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = "COMPLETED"; // COMPLETED, FAILED

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "collector_id", nullable = false)
    private User collector;

    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @OneToOne(mappedBy = "payment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Receipt receipt;

    public Payment() {}

    public Payment(Long id, WaterDistribution distribution, BigDecimal amount, String paymentMethod, String paymentStatus, User collector, LocalDateTime paymentDate, String referenceNumber, Receipt receipt) {
        this.id = id;
        this.distribution = distribution;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus != null ? paymentStatus : "COMPLETED";
        this.collector = collector;
        this.paymentDate = paymentDate;
        this.referenceNumber = referenceNumber;
        this.receipt = receipt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public WaterDistribution getDistribution() { return distribution; }
    public void setDistribution(WaterDistribution distribution) { this.distribution = distribution; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public User getCollector() { return collector; }
    public void setCollector(User collector) { this.collector = collector; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public Receipt getReceipt() { return receipt; }
    public void setReceipt(Receipt receipt) { this.receipt = receipt; }

    public static PaymentBuilder builder() { return new PaymentBuilder(); }

    public static class PaymentBuilder {
        private Long id;
        private WaterDistribution distribution;
        private BigDecimal amount;
        private String paymentMethod;
        private String paymentStatus = "COMPLETED";
        private User collector;
        private LocalDateTime paymentDate;
        private String referenceNumber;
        private Receipt receipt;

        public PaymentBuilder id(Long id) { this.id = id; return this; }
        public PaymentBuilder distribution(WaterDistribution distribution) { this.distribution = distribution; return this; }
        public PaymentBuilder amount(BigDecimal amount) { this.amount = amount; return this; }
        public PaymentBuilder paymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; return this; }
        public PaymentBuilder paymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; return this; }
        public PaymentBuilder collector(User collector) { this.collector = collector; return this; }
        public PaymentBuilder paymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; return this; }
        public PaymentBuilder referenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; return this; }
        public PaymentBuilder receipt(Receipt receipt) { this.receipt = receipt; return this; }

        public Payment build() {
            return new Payment(id, distribution, amount, paymentMethod, paymentStatus, collector, paymentDate, referenceNumber, receipt);
        }
    }
}
