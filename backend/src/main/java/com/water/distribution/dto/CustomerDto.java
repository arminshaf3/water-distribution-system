package com.water.distribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CustomerDto {
    private Long id;
    private String customerCode;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Village ID is required")
    private Long villageId;

    private String villageName;
    private String status;
    private java.math.BigDecimal lastMeterReading;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CustomerDto() {}

    public CustomerDto(Long id, String customerCode, String fullName, String phoneNumber, String address, Long villageId, String villageName, String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.customerCode = customerCode;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.villageId = villageId;
        this.villageName = villageName;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Long getVillageId() { return villageId; }
    public void setVillageId(Long villageId) { this.villageId = villageId; }

    public String getVillageName() { return villageName; }
    public void setVillageName(String villageName) { this.villageName = villageName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public java.math.BigDecimal getLastMeterReading() { return lastMeterReading; }
    public void setLastMeterReading(java.math.BigDecimal lastMeterReading) { this.lastMeterReading = lastMeterReading; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static CustomerDtoBuilder builder() { return new CustomerDtoBuilder(); }

    public static class CustomerDtoBuilder {
        private Long id;
        private String customerCode;
        private String fullName;
        private String phoneNumber;
        private String address;
        private Long villageId;
        private String villageName;
        private String status;
        private java.math.BigDecimal lastMeterReading;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public CustomerDtoBuilder id(Long id) { this.id = id; return this; }
        public CustomerDtoBuilder customerCode(String customerCode) { this.customerCode = customerCode; return this; }
        public CustomerDtoBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public CustomerDtoBuilder phoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; return this; }
        public CustomerDtoBuilder address(String address) { this.address = address; return this; }
        public CustomerDtoBuilder villageId(Long villageId) { this.villageId = villageId; return this; }
        public CustomerDtoBuilder villageName(String villageName) { this.villageName = villageName; return this; }
        public CustomerDtoBuilder status(String status) { this.status = status; return this; }
        public CustomerDtoBuilder lastMeterReading(java.math.BigDecimal lastMeterReading) { this.lastMeterReading = lastMeterReading; return this; }
        public CustomerDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public CustomerDtoBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public CustomerDto build() {
            CustomerDto dto = new CustomerDto();
            dto.setId(id);
            dto.setCustomerCode(customerCode);
            dto.setFullName(fullName);
            dto.setPhoneNumber(phoneNumber);
            dto.setAddress(address);
            dto.setVillageId(villageId);
            dto.setVillageName(villageName);
            dto.setStatus(status);
            dto.setLastMeterReading(lastMeterReading);
            dto.setCreatedAt(createdAt);
            dto.setUpdatedAt(updatedAt);
            return dto;
        }
    }
}
