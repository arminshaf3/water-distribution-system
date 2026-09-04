package com.water.distribution.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_code", nullable = false, unique = true, length = 30)
    private String customerCode;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(nullable = false, length = 255)
    private String address;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "village_id", nullable = false)
    private VillageArea village;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Column(name = "last_meter_reading", precision = 10, scale = 2)
    private java.math.BigDecimal lastMeterReading;

    public Customer() {}

    public Customer(Long id, String customerCode, String fullName, String phoneNumber, String address, VillageArea village, String status, java.math.BigDecimal lastMeterReading) {
        this.id = id;
        this.customerCode = customerCode;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.village = village;
        this.status = status != null ? status : "ACTIVE";
        this.lastMeterReading = lastMeterReading;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getName() { return fullName; }
    public void setName(String name) { this.fullName = name; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPhone() { return phoneNumber; }
    public void setPhone(String phone) { this.phoneNumber = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public VillageArea getVillage() { return village; }
    public void setVillage(VillageArea village) { this.village = village; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public java.math.BigDecimal getLastMeterReading() { return lastMeterReading; }
    public void setLastMeterReading(java.math.BigDecimal lastMeterReading) { this.lastMeterReading = lastMeterReading; }

    public static CustomerBuilder builder() { return new CustomerBuilder(); }

    public static class CustomerBuilder {
        private Long id;
        private String customerCode;
        private String fullName;
        private String phoneNumber;
        private String address;
        private VillageArea village;
        private String status = "ACTIVE";
        private java.math.BigDecimal lastMeterReading;

        public CustomerBuilder id(Long id) { this.id = id; return this; }
        public CustomerBuilder customerCode(String customerCode) { this.customerCode = customerCode; return this; }
        public CustomerBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public CustomerBuilder phoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; return this; }
        public CustomerBuilder address(String address) { this.address = address; return this; }
        public CustomerBuilder village(VillageArea village) { this.village = village; return this; }
        public CustomerBuilder status(String status) { this.status = status; return this; }
        public CustomerBuilder lastMeterReading(java.math.BigDecimal lastMeterReading) { this.lastMeterReading = lastMeterReading; return this; }

        public Customer build() {
            return new Customer(id, customerCode, fullName, phoneNumber, address, village, status, lastMeterReading);
        }
    }
}
