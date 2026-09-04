package com.water.distribution.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class DistributionResponse {
    private Long id;
    private String distributionCode;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private String customerPhone;
    private String villageName;
    private Long collectorId;
    private String collectorName;
    private BigDecimal quantityLitres;
    private BigDecimal pricePerLitre;
    private BigDecimal totalAmount;
    private LocalDateTime distributionDate;
    private String paymentStatus;
    private String receiptNumber;

    public DistributionResponse() {}

    public DistributionResponse(Long id, String distributionCode, Long customerId, String customerCode, String customerName, String customerPhone, String villageName, Long collectorId, String collectorName, BigDecimal quantityLitres, BigDecimal pricePerLitre, BigDecimal totalAmount, LocalDateTime distributionDate, String paymentStatus, String receiptNumber) {
        this.id = id;
        this.distributionCode = distributionCode;
        this.customerId = customerId;
        this.customerCode = customerCode;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.villageName = villageName;
        this.collectorId = collectorId;
        this.collectorName = collectorName;
        this.quantityLitres = quantityLitres;
        this.pricePerLitre = pricePerLitre;
        this.totalAmount = totalAmount;
        this.distributionDate = distributionDate;
        this.paymentStatus = paymentStatus;
        this.receiptNumber = receiptNumber;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDistributionCode() { return distributionCode; }
    public void setDistributionCode(String distributionCode) { this.distributionCode = distributionCode; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getVillageName() { return villageName; }
    public void setVillageName(String villageName) { this.villageName = villageName; }

    public Long getCollectorId() { return collectorId; }
    public void setCollectorId(Long collectorId) { this.collectorId = collectorId; }

    public String getCollectorName() { return collectorName; }
    public void setCollectorName(String collectorName) { this.collectorName = collectorName; }

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

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public static DistributionResponseBuilder builder() { return new DistributionResponseBuilder(); }

    public static class DistributionResponseBuilder {
        private Long id;
        private String distributionCode;
        private Long customerId;
        private String customerCode;
        private String customerName;
        private String customerPhone;
        private String villageName;
        private Long collectorId;
        private String collectorName;
        private BigDecimal quantityLitres;
        private BigDecimal pricePerLitre;
        private BigDecimal totalAmount;
        private LocalDateTime distributionDate;
        private String paymentStatus;
        private String receiptNumber;

        public DistributionResponseBuilder id(Long id) { this.id = id; return this; }
        public DistributionResponseBuilder distributionCode(String distributionCode) { this.distributionCode = distributionCode; return this; }
        public DistributionResponseBuilder customerId(Long customerId) { this.customerId = customerId; return this; }
        public DistributionResponseBuilder customerCode(String customerCode) { this.customerCode = customerCode; return this; }
        public DistributionResponseBuilder customerName(String customerName) { this.customerName = customerName; return this; }
        public DistributionResponseBuilder customerPhone(String customerPhone) { this.customerPhone = customerPhone; return this; }
        public DistributionResponseBuilder villageName(String villageName) { this.villageName = villageName; return this; }
        public DistributionResponseBuilder collectorId(Long collectorId) { this.collectorId = collectorId; return this; }
        public DistributionResponseBuilder collectorName(String collectorName) { this.collectorName = collectorName; return this; }
        public DistributionResponseBuilder quantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; return this; }
        public DistributionResponseBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }
        public DistributionResponseBuilder totalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; return this; }
        public DistributionResponseBuilder distributionDate(LocalDateTime distributionDate) { this.distributionDate = distributionDate; return this; }
        public DistributionResponseBuilder paymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; return this; }
        public DistributionResponseBuilder receiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; return this; }

        public DistributionResponse build() {
            return new DistributionResponse(id, distributionCode, customerId, customerCode, customerName, customerPhone, villageName, collectorId, collectorName, quantityLitres, pricePerLitre, totalAmount, distributionDate, paymentStatus, receiptNumber);
        }
    }
}
