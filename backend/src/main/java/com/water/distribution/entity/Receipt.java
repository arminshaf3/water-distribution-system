package com.water.distribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "receipts")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 50)
    private String receiptNumber;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    private Payment payment;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Receipt() {}

    public Receipt(Long id, String receiptNumber, Payment payment, LocalDateTime issuedAt, LocalDateTime createdAt) {
        this.id = id;
        this.receiptNumber = receiptNumber;
        this.payment = payment;
        this.issuedAt = issuedAt;
        this.createdAt = createdAt;
    }

    @PrePersist
    protected void onCreate() {
        if (issuedAt == null) {
            issuedAt = LocalDateTime.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }

    public LocalDateTime getGeneratedAt() { return issuedAt; }

    public WaterDistribution getDistribution() {
        return payment != null ? payment.getDistribution() : null;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static ReceiptBuilder builder() { return new ReceiptBuilder(); }

    public static class ReceiptBuilder {
        private Long id;
        private String receiptNumber;
        private Payment payment;
        private LocalDateTime issuedAt;
        private LocalDateTime createdAt;

        public ReceiptBuilder id(Long id) { this.id = id; return this; }
        public ReceiptBuilder receiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; return this; }
        public ReceiptBuilder payment(Payment payment) { this.payment = payment; return this; }
        public ReceiptBuilder issuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; return this; }
        public ReceiptBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Receipt build() {
            return new Receipt(id, receiptNumber, payment, issuedAt, createdAt);
        }
    }
}
