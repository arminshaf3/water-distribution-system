package com.water.distribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PaymentRequest {

    @NotNull(message = "Distribution ID is required")
    private Long distributionId;

    private BigDecimal amount; // Optional: Backend verifies amount matches distribution total

    @NotBlank(message = "Payment method is required")
    private String paymentMethod; // CASH, ONLINE

    private String referenceNumber;

    public PaymentRequest() {}

    public PaymentRequest(Long distributionId, BigDecimal amount, String paymentMethod, String referenceNumber) {
        this.distributionId = distributionId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.referenceNumber = referenceNumber;
    }

    public Long getDistributionId() { return distributionId; }
    public void setDistributionId(Long distributionId) { this.distributionId = distributionId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
}
