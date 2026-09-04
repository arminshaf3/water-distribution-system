package com.water.distribution.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentResponse {
    private Long id;
    private Long distributionId;
    private String distributionCode;
    private String customerName;
    private String customerCode;
    private BigDecimal amount;
    private String paymentMethod;
    private String paymentStatus;
    private String collectorName;
    private LocalDateTime paymentDate;
    private String referenceNumber;
    private String receiptNumber;

    public PaymentResponse() {}

    public PaymentResponse(Long id, Long distributionId, String distributionCode, String customerName, String customerCode, BigDecimal amount, String paymentMethod, String paymentStatus, String collectorName, LocalDateTime paymentDate, String referenceNumber, String receiptNumber) {
        this.id = id;
        this.distributionId = distributionId;
        this.distributionCode = distributionCode;
        this.customerName = customerName;
        this.customerCode = customerCode;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.collectorName = collectorName;
        this.paymentDate = paymentDate;
        this.referenceNumber = referenceNumber;
        this.receiptNumber = receiptNumber;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDistributionId() { return distributionId; }
    public void setDistributionId(Long distributionId) { this.distributionId = distributionId; }

    public String getDistributionCode() { return distributionCode; }
    public void setDistributionCode(String distributionCode) { this.distributionCode = distributionCode; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getCollectorName() { return collectorName; }
    public void setCollectorName(String collectorName) { this.collectorName = collectorName; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public static PaymentResponseBuilder builder() { return new PaymentResponseBuilder(); }

    public static class PaymentResponseBuilder {
        private Long id;
        private Long distributionId;
        private String distributionCode;
        private String customerName;
        private String customerCode;
        private BigDecimal amount;
        private String paymentMethod;
        private String paymentStatus;
        private String collectorName;
        private LocalDateTime paymentDate;
        private String referenceNumber;
        private String receiptNumber;

        public PaymentResponseBuilder id(Long id) { this.id = id; return this; }
        public PaymentResponseBuilder distributionId(Long distributionId) { this.distributionId = distributionId; return this; }
        public PaymentResponseBuilder distributionCode(String distributionCode) { this.distributionCode = distributionCode; return this; }
        public PaymentResponseBuilder customerName(String customerName) { this.customerName = customerName; return this; }
        public PaymentResponseBuilder customerCode(String customerCode) { this.customerCode = customerCode; return this; }
        public PaymentResponseBuilder amount(BigDecimal amount) { this.amount = amount; return this; }
        public PaymentResponseBuilder paymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; return this; }
        public PaymentResponseBuilder paymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; return this; }
        public PaymentResponseBuilder collectorName(String collectorName) { this.collectorName = collectorName; return this; }
        public PaymentResponseBuilder paymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; return this; }
        public PaymentResponseBuilder referenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; return this; }
        public PaymentResponseBuilder receiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; return this; }

        public PaymentResponse build() {
            return new PaymentResponse(id, distributionId, distributionCode, customerName, customerCode, amount, paymentMethod, paymentStatus, collectorName, paymentDate, referenceNumber, receiptNumber);
        }
    }
}
