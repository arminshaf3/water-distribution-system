package com.water.distribution.service;

import com.water.distribution.dto.DistributionRequest;
import com.water.distribution.dto.DistributionResponse;
import com.water.distribution.dto.PagedResponse;
import com.water.distribution.entity.*;
import com.water.distribution.exception.BadRequestException;
import com.water.distribution.exception.ResourceNotFoundException;
import com.water.distribution.repository.*;
import com.water.distribution.util.ReceiptNumberGenerator;
import com.water.distribution.util.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.annotation.PostConstruct;

@Service
public class DistributionService {

    private final WaterDistributionRepository distributionRepository;
    private final CustomerRepository customerRepository;
    private final WaterPriceRepository waterPriceRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final ReceiptRepository receiptRepository;

    public DistributionService(WaterDistributionRepository distributionRepository,
                               CustomerRepository customerRepository,
                               WaterPriceRepository waterPriceRepository,
                               UserRepository userRepository,
                               PaymentRepository paymentRepository,
                               ReceiptRepository receiptRepository) {
        this.distributionRepository = distributionRepository;
        this.customerRepository = customerRepository;
        this.waterPriceRepository = waterPriceRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.receiptRepository = receiptRepository;
    }

    @PostConstruct
    public void repairExistingDistributionPrices() {
        try {
            List<WaterDistribution> allDistributions = distributionRepository.findAll();
            for (WaterDistribution d : allDistributions) {
                BigDecimal qty = d.getQuantityLitres() != null ? d.getQuantityLitres() : BigDecimal.ZERO;
                BigDecimal applicableRate = new BigDecimal("5.00");
                if (qty.compareTo(new BigDecimal("20")) <= 0) {
                    applicableRate = new BigDecimal("4.00");
                } else if (qty.compareTo(new BigDecimal("50")) > 0) {
                    applicableRate = new BigDecimal("6.50");
                }
                d.setPricePerLitre(applicableRate);
                d.setTotalAmount(qty.multiply(applicableRate));
                distributionRepository.save(d);
            }
        } catch (Exception e) {
            System.err.println("Database tier price repair notice: " + e.getMessage());
        }
    }

    @Transactional
    public DistributionResponse recordDistribution(DistributionRequest request) {
        // 1. Validate Customer
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));

        if (!"ACTIVE".equalsIgnoreCase(customer.getStatus())) {
            throw new BadRequestException("Customer '" + customer.getFullName() + "' is inactive. Cannot record distribution.");
        }

        // 2. Validate Collector (Current Logged In User)
        Long collectorId = SecurityUtils.getCurrentUserId();
        User collector = userRepository.findById(collectorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", collectorId));

        if (!Boolean.TRUE.equals(collector.getIsActive())) {
            throw new BadRequestException("Collector user account is inactive.");
        }

        // 3. Get Active Price Rate Snapshot
        WaterPrice activePrice = waterPriceRepository.findCurrentActivePrice()
                .orElseThrow(() -> new BadRequestException("No active water price rate configured. Please contact administrator."));

        BigDecimal pricePerLitre = activePrice.getPricePerLitre();

        // 4. Validate Quantity / Meter Reading Calculation Engine
        BigDecimal quantityLitres = request.getQuantityLitres();
        if (request.getCurrentMeterReading() != null && request.getPreviousMeterReading() != null) {
            if (request.getCurrentMeterReading().compareTo(request.getPreviousMeterReading()) < 0) {
                throw new BadRequestException("Current meter reading (" + request.getCurrentMeterReading() + 
                        ") cannot be less than previous meter reading (" + request.getPreviousMeterReading() + ").");
            }
            quantityLitres = request.getCurrentMeterReading().subtract(request.getPreviousMeterReading());
        }

        if (quantityLitres == null || quantityLitres.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Calculated quantity in litres must be greater than zero.");
        }

        // 5. Compute Total Amount (Whole-Volume Slab Bracket Rate Rule)
        BigDecimal applicableRate = activePrice.getPricePerLitre();
        List<com.water.distribution.entity.WaterPriceTier> tiers = activePrice.getTiers();

        if (tiers != null && !tiers.isEmpty()) {
            for (com.water.distribution.entity.WaterPriceTier tier : tiers) {
                BigDecimal min = tier.getMinLitres() != null ? tier.getMinLitres() : BigDecimal.ZERO;
                BigDecimal max = tier.getMaxLitres();

                // If quantity falls into this slab range (e.g. 51+ Litres where max is null or 0)
                if (quantityLitres.compareTo(min) >= 0 && (max == null || max.compareTo(BigDecimal.ZERO) <= 0 || quantityLitres.compareTo(max) <= 0)) {
                    applicableRate = tier.getPricePerLitre();
                    break;
                }
            }
        }

        BigDecimal totalAmount = quantityLitres.multiply(applicableRate);
        // 6. Update Customer's Last Recorded Meter Reading for future billing cycles
        if (request.getCurrentMeterReading() != null) {
            customer.setLastMeterReading(request.getCurrentMeterReading());
        } else if (customer.getLastMeterReading() != null) {
            customer.setLastMeterReading(customer.getLastMeterReading().add(quantityLitres));
        } else {
            customer.setLastMeterReading(new BigDecimal("120").add(quantityLitres));
        }
        customerRepository.save(customer);

        // 7. Generate Unique Distribution Code
        String distributionCode = generateDistributionCode();

        // 7. Create Water Distribution Record
        boolean isUpfrontPaid = Boolean.TRUE.equals(request.getCollectPaymentNow());
        String initialPaymentStatus = isUpfrontPaid ? "PAID" : "PENDING";

        WaterDistribution distribution = WaterDistribution.builder()
                .distributionCode(distributionCode)
                .customer(customer)
                .collector(collector)
                .quantityLitres(quantityLitres)
                .pricePerLitre(applicableRate) // Lock historical tier rate snapshot!
                .totalAmount(totalAmount)
                .distributionDate(LocalDateTime.now())
                .paymentStatus(initialPaymentStatus)
                .build();

        WaterDistribution savedDistribution = distributionRepository.save(distribution);

        String generatedReceiptNumber = null;

        // 8. Handle Upfront Payment if requested
        if (isUpfrontPaid) {
            String method = request.getPaymentMethod() != null ? request.getPaymentMethod().toUpperCase() : "CASH";
            if (!"CASH".equals(method) && !"ONLINE".equals(method)) {
                throw new BadRequestException("Invalid payment method. Allowed values: CASH, ONLINE");
            }

            Payment payment = Payment.builder()
                    .distribution(savedDistribution)
                    .amount(totalAmount)
                    .paymentMethod(method)
                    .paymentStatus("COMPLETED")
                    .collector(collector)
                    .paymentDate(LocalDateTime.now())
                    .referenceNumber(request.getReferenceNumber())
                    .build();

            Payment savedPayment = paymentRepository.save(payment);

            generatedReceiptNumber = ReceiptNumberGenerator.generateReceiptNumber();
            Receipt receipt = Receipt.builder()
                    .receiptNumber(generatedReceiptNumber)
                    .payment(savedPayment)
                    .issuedAt(LocalDateTime.now())
                    .build();

            receiptRepository.save(receipt);
        }

        return mapToResponse(savedDistribution, generatedReceiptNumber);
    }

    public DistributionResponse getDistributionById(Long id) {
        WaterDistribution distribution = distributionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WaterDistribution", "id", id));

        String receiptNumber = receiptRepository.findByPaymentDistributionId(distribution.getId())
                .map(Receipt::getReceiptNumber)
                .orElse(null);

        return mapToResponse(distribution, receiptNumber);
    }

    public PagedResponse<DistributionResponse> getDistributions(
            Long customerId, Long collectorId, String paymentStatus,
            LocalDateTime startDate, LocalDateTime endDate,
            int page, int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "distributionDate"));
        Page<WaterDistribution> distPage = distributionRepository.filterDistributions(
                customerId, collectorId, paymentStatus, startDate, endDate, pageable);

        List<DistributionResponse> content = distPage.getContent().stream()
                .map(d -> {
                    String receiptNumber = receiptRepository.findByPaymentDistributionId(d.getId())
                            .map(Receipt::getReceiptNumber)
                            .orElse(null);
                    return mapToResponse(d, receiptNumber);
                })
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

    public PagedResponse<DistributionResponse> getMyDistributions(int page, int size) {
        Long currentCollectorId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "distributionDate"));
        Page<WaterDistribution> distPage = distributionRepository.findByCollectorId(currentCollectorId, pageable);

        List<DistributionResponse> content = distPage.getContent().stream()
                .map(d -> {
                    String receiptNumber = receiptRepository.findByPaymentDistributionId(d.getId())
                            .map(Receipt::getReceiptNumber)
                            .orElse(null);
                    return mapToResponse(d, receiptNumber);
                })
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

    private String generateDistributionCode() {
        String datePrefix = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "DIST-" + datePrefix + "-" + suffix;
    }

    private DistributionResponse mapToResponse(WaterDistribution d, String receiptNumber) {
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
                .receiptNumber(receiptNumber)
                .build();
    }
}
