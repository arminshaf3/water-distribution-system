package com.water.distribution.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReceiptDto {
    private Long id;
    private String receiptNumber;
    private String customerCode;
    private String customerName;
    private String customerAddress;
    private String customerPhone;
    private String villageName;
    private BigDecimal quantityLitres;
    private BigDecimal pricePerLitre;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private String referenceNumber;
    private String collectorName;
    private LocalDateTime issuedAt;

    public ReceiptDto() {}

    public ReceiptDto(Long id, String receiptNumber, String customerCode, String customerName, String customerAddress, String customerPhone, String villageName, BigDecimal quantityLitres, BigDecimal pricePerLitre, BigDecimal totalAmount, String paymentMethod, String referenceNumber, String collectorName, LocalDateTime issuedAt) {
        this.id = id;
        this.receiptNumber = receiptNumber;
        this.customerCode = customerCode;
        this.customerName = customerName;
        this.customerAddress = customerAddress;
        this.customerPhone = customerPhone;
        this.villageName = villageName;
        this.quantityLitres = quantityLitres;
        this.pricePerLitre = pricePerLitre;
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod;
        this.referenceNumber = referenceNumber;
        this.collectorName = collectorName;
        this.issuedAt = issuedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String customerAddress) { this.customerAddress = customerAddress; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getVillageName() { return villageName; }
    public void setVillageName(String villageName) { this.villageName = villageName; }

    public BigDecimal getQuantityLitres() { return quantityLitres; }
    public void setQuantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; }

    public BigDecimal getPricePerLitre() { return pricePerLitre; }
    public void setPricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getCollectorName() { return collectorName; }
    public void setCollectorName(String collectorName) { this.collectorName = collectorName; }

    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }

    public static ReceiptDtoBuilder builder() { return new ReceiptDtoBuilder(); }

    public static class ReceiptDtoBuilder {
        private Long id;
        private String receiptNumber;
        private String customerCode;
        private String customerName;
        private String customerAddress;
        private String customerPhone;
        private String villageName;
        private BigDecimal quantityLitres;
        private BigDecimal pricePerLitre;
        private BigDecimal totalAmount;
        private String paymentMethod;
        private String referenceNumber;
        private String collectorName;
        private LocalDateTime issuedAt;

        public ReceiptDtoBuilder id(Long id) { this.id = id; return this; }
        public ReceiptDtoBuilder receiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; return this; }
        public ReceiptDtoBuilder customerCode(String customerCode) { this.customerCode = customerCode; return this; }
        public ReceiptDtoBuilder customerName(String customerName) { this.customerName = customerName; return this; }
        public ReceiptDtoBuilder customerAddress(String customerAddress) { this.customerAddress = customerAddress; return this; }
        public ReceiptDtoBuilder customerPhone(String customerPhone) { this.customerPhone = customerPhone; return this; }
        public ReceiptDtoBuilder villageName(String villageName) { this.villageName = villageName; return this; }
        public ReceiptDtoBuilder quantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; return this; }
        public ReceiptDtoBuilder pricePerLitre(BigDecimal pricePerLitre) { this.pricePerLitre = pricePerLitre; return this; }
        public ReceiptDtoBuilder totalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; return this; }
        public ReceiptDtoBuilder paymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; return this; }
        public ReceiptDtoBuilder referenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; return this; }
        public ReceiptDtoBuilder collectorName(String collectorName) { this.collectorName = collectorName; return this; }
        public ReceiptDtoBuilder issuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; return this; }

        public ReceiptDto build() {
            return new ReceiptDto(id, receiptNumber, customerCode, customerName, customerAddress, customerPhone, villageName, quantityLitres, pricePerLitre, totalAmount, paymentMethod, referenceNumber, collectorName, issuedAt);
        }
    }
}
