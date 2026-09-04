package com.water.distribution.service;

import com.water.distribution.dto.*;
import com.water.distribution.entity.Customer;
import com.water.distribution.entity.Payment;
import com.water.distribution.entity.VillageArea;
import com.water.distribution.entity.WaterDistribution;
import com.water.distribution.exception.BadRequestException;
import com.water.distribution.exception.ResourceNotFoundException;
import com.water.distribution.repository.CustomerRepository;
import com.water.distribution.repository.PaymentRepository;
import com.water.distribution.repository.VillageAreaRepository;
import com.water.distribution.repository.WaterDistributionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final VillageAreaRepository villageAreaRepository;
    private final WaterDistributionRepository distributionRepository;
    private final PaymentRepository paymentRepository;

    public CustomerService(CustomerRepository customerRepository,
                           VillageAreaRepository villageAreaRepository,
                           WaterDistributionRepository distributionRepository,
                           PaymentRepository paymentRepository) {
        this.customerRepository = customerRepository;
        this.villageAreaRepository = villageAreaRepository;
        this.distributionRepository = distributionRepository;
        this.paymentRepository = paymentRepository;
    }

    public PagedResponse<CustomerDto> getCustomers(String search, Long villageId, String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customer> customerPage = customerRepository.searchCustomers(search, villageId, status, pageable);

        List<CustomerDto> content = customerPage.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return PagedResponse.<CustomerDto>builder()
                .content(content)
                .pageNo(customerPage.getNumber())
                .pageSize(customerPage.getSize())
                .totalElements(customerPage.getTotalElements())
                .totalPages(customerPage.getTotalPages())
                .last(customerPage.isLast())
                .build();
    }

    public CustomerDto getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));
        return mapToDto(customer);
    }

    @Transactional
    public CustomerDto createCustomer(CustomerDto customerDto) {
        VillageArea village = villageAreaRepository.findById(customerDto.getVillageId())
                .orElseThrow(() -> new ResourceNotFoundException("VillageArea", "id", customerDto.getVillageId()));

        String code = customerDto.getCustomerCode();
        if (code == null || code.trim().isEmpty()) {
            code = generateUniqueCustomerCode(village);
        } else if (customerRepository.existsByCustomerCode(code)) {
            throw new BadRequestException("Customer code '" + code + "' already exists");
        }

        Customer customer = Customer.builder()
                .customerCode(code)
                .fullName(customerDto.getFullName())
                .phoneNumber(customerDto.getPhoneNumber())
                .address(customerDto.getAddress())
                .village(village)
                .status("ACTIVE")
                .lastMeterReading(customerDto.getLastMeterReading() != null ? customerDto.getLastMeterReading() : new java.math.BigDecimal("120.00"))
                .build();

        Customer saved = customerRepository.save(customer);
        return mapToDto(saved);
    }

    @Transactional
    public CustomerDto updateCustomer(Long id, CustomerDto customerDto) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));

        VillageArea village = villageAreaRepository.findById(customerDto.getVillageId())
                .orElseThrow(() -> new ResourceNotFoundException("VillageArea", "id", customerDto.getVillageId()));

        if (customerDto.getCustomerCode() != null &&
            !customerDto.getCustomerCode().equals(customer.getCustomerCode()) &&
            customerRepository.existsByCustomerCode(customerDto.getCustomerCode())) {
            throw new BadRequestException("Customer code '" + customerDto.getCustomerCode() + "' already exists");
        }

        if (customerDto.getCustomerCode() != null && !customerDto.getCustomerCode().trim().isEmpty()) {
            customer.setCustomerCode(customerDto.getCustomerCode());
        }

        customer.setFullName(customerDto.getFullName());
        customer.setPhoneNumber(customerDto.getPhoneNumber());
        customer.setAddress(customerDto.getAddress());
        customer.setVillage(village);

        Customer updated = customerRepository.save(customer);
        return mapToDto(updated);
    }

    @Transactional
    public CustomerDto toggleCustomerStatus(Long id, String status) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));

        String newStatus = (status != null && !status.trim().isEmpty()) ?
                status.toUpperCase() :
                ("ACTIVE".equalsIgnoreCase(customer.getStatus()) ? "INACTIVE" : "ACTIVE");

        customer.setStatus(newStatus);
        Customer updated = customerRepository.save(customer);
        return mapToDto(updated);
    }

    public PagedResponse<DistributionResponse> getCustomerDistributions(Long customerId, int page, int size) {
        if (!customerRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Customer", "id", customerId);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "distributionDate"));
        Page<WaterDistribution> distPage = distributionRepository.findByCustomerId(customerId, pageable);

        List<DistributionResponse> content = distPage.getContent().stream()
                .map(this::mapToDistributionResponse)
                .collect(Collectors.toList());

        return PagedResponse.<DistributionResponse>builder()
                .content(content)
                .pageNo(distPage.getNumber())
                .pageSize(distPage.getSize())
                .totalElements(distPage.getTotalElements())
                .totalPages(distPage.getTotalPages())
                .last(distPage.isLast())
                .build();
    }

    public PagedResponse<PaymentResponse> getCustomerPayments(Long customerId, int page, int size) {
        if (!customerRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Customer", "id", customerId);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "paymentDate"));
        Page<Payment> paymentPage = paymentRepository.findByDistributionCustomerId(customerId, pageable);

        List<PaymentResponse> content = paymentPage.getContent().stream()
                .map(this::mapToPaymentResponse)
                .collect(Collectors.toList());

        return PagedResponse.<PaymentResponse>builder()
                .content(content)
                .pageNo(paymentPage.getNumber())
                .pageSize(paymentPage.getSize())
                .totalElements(paymentPage.getTotalElements())
                .totalPages(paymentPage.getTotalPages())
                .last(paymentPage.isLast())
                .build();
    }

    private String generateUniqueCustomerCode(VillageArea village) {
        String prefix = "CUST-" + (village.getCode() != null ? village.getCode().toUpperCase() : "VIL") + "-";
        long nextId = customerRepository.count() + 1;
        String code = prefix + String.format("%04d", nextId);
        while (customerRepository.existsByCustomerCode(code)) {
            nextId++;
            code = prefix + String.format("%04d", nextId);
        }
        return code;
    }

    private CustomerDto mapToDto(Customer customer) {
        return CustomerDto.builder()
                .id(customer.getId())
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .phoneNumber(customer.getPhoneNumber())
                .address(customer.getAddress())
                .villageId(customer.getVillage().getId())
                .villageName(customer.getVillage().getName())
                .status(customer.getStatus())
                .lastMeterReading(customer.getLastMeterReading())
                .createdAt(customer.getCreatedAt())
                .build();
    }

    private DistributionResponse mapToDistributionResponse(WaterDistribution d) {
        return DistributionResponse.builder()
                .id(d.getId())
                .distributionCode(d.getDistributionCode())
                .customerId(d.getCustomer().getId())
                .customerCode(d.getCustomer().getCustomerCode())
                .customerName(d.getCustomer().getFullName())
                .customerPhone(d.getCustomer().getPhoneNumber())
                .villageName(d.getCustomer().getVillage().getName())
                .collectorId(d.getCollector().getId())
                .collectorName(d.getCollector().getFullName())
                .quantityLitres(d.getQuantityLitres())
                .pricePerLitre(d.getPricePerLitre())
                .totalAmount(d.getTotalAmount())
                .distributionDate(d.getDistributionDate())
                .paymentStatus(d.getPaymentStatus())
                .build();
    }

    private PaymentResponse mapToPaymentResponse(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .distributionId(p.getDistribution().getId())
                .distributionCode(p.getDistribution().getDistributionCode())
                .customerName(p.getDistribution().getCustomer().getFullName())
                .amount(p.getAmount())
                .paymentMethod(p.getPaymentMethod())
                .paymentStatus(p.getPaymentStatus())
                .referenceNumber(p.getReferenceNumber())
                .collectorName(p.getCollector().getFullName())
                .paymentDate(p.getPaymentDate())
                .build();
    }
}
