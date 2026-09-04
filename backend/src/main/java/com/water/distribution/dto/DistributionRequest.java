package com.water.distribution.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class DistributionRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @DecimalMin(value = "0.00", message = "Quantity must not be negative")
    private BigDecimal quantityLitres;

    private BigDecimal previousMeterReading;
    private BigDecimal currentMeterReading;

    private Boolean collectPaymentNow = false;
    private String paymentMethod; // CASH, ONLINE
    private String referenceNumber;

    public DistributionRequest() {}

    public DistributionRequest(Long customerId, BigDecimal quantityLitres, BigDecimal previousMeterReading, BigDecimal currentMeterReading, Boolean collectPaymentNow, String paymentMethod, String referenceNumber) {
        this.customerId = customerId;
        this.quantityLitres = quantityLitres;
        this.previousMeterReading = previousMeterReading;
        this.currentMeterReading = currentMeterReading;
        this.collectPaymentNow = collectPaymentNow != null ? collectPaymentNow : false;
        this.paymentMethod = paymentMethod;
        this.referenceNumber = referenceNumber;
    }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public BigDecimal getQuantityLitres() { return quantityLitres; }
    public void setQuantityLitres(BigDecimal quantityLitres) { this.quantityLitres = quantityLitres; }

    public BigDecimal getPreviousMeterReading() { return previousMeterReading; }
    public void setPreviousMeterReading(BigDecimal previousMeterReading) { this.previousMeterReading = previousMeterReading; }

    public BigDecimal getCurrentMeterReading() { return currentMeterReading; }
    public void setCurrentMeterReading(BigDecimal currentMeterReading) { this.currentMeterReading = currentMeterReading; }

    public Boolean getCollectPaymentNow() { return collectPaymentNow; }
    public void setCollectPaymentNow(Boolean collectPaymentNow) { this.collectPaymentNow = collectPaymentNow; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
}
