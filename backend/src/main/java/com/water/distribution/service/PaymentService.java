package com.water.distribution.service;

import com.water.distribution.dto.PagedResponse;
import com.water.distribution.dto.PaymentRequest;
import com.water.distribution.dto.PaymentResponse;
import com.water.distribution.dto.ReceiptDto;
import com.water.distribution.entity.*;
import com.water.distribution.exception.BadRequestException;
import com.water.distribution.exception.ResourceNotFoundException;
import com.water.distribution.repository.PaymentRepository;
import com.water.distribution.repository.ReceiptRepository;
import com.water.distribution.repository.UserRepository;
import com.water.distribution.repository.WaterDistributionRepository;
import com.water.distribution.util.ReceiptNumberGenerator;
import com.water.distribution.util.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final WaterDistributionRepository distributionRepository;
    private final ReceiptRepository receiptRepository;
    private final UserRepository userRepository;

    public PaymentService(PaymentRepository paymentRepository,
                          WaterDistributionRepository distributionRepository,
                          ReceiptRepository receiptRepository,
                          UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.distributionRepository = distributionRepository;
        this.receiptRepository = receiptRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {
        WaterDistribution distribution = distributionRepository.findById(request.getDistributionId())
                .orElseThrow(() -> new ResourceNotFoundException("WaterDistribution", "id", request.getDistributionId()));

        if ("PAID".equalsIgnoreCase(distribution.getPaymentStatus())) {
            throw new BadRequestException("Payment has already been recorded for distribution '" + distribution.getDistributionCode() + "'");
        }
        if ("CANCELLED".equalsIgnoreCase(distribution.getPaymentStatus())) {
            throw new BadRequestException("Cannot collect payment for a cancelled distribution.");
        }

        String method = request.getPaymentMethod() != null ? request.getPaymentMethod().toUpperCase() : "CASH";
        if (!"CASH".equals(method) && !"ONLINE".equals(method)) {
            throw new BadRequestException("Invalid payment method. Allowed values: CASH, ONLINE");
        }

        if (request.getAmount() != null && request.getAmount().compareTo(distribution.getTotalAmount()) != 0) {
            throw new BadRequestException("Payment amount (" + request.getAmount() + ") does not match distribution total (" + distribution.getTotalAmount() + ")");
        }

        Long collectorId = SecurityUtils.getCurrentUserId();
        User collector = userRepository.findById(collectorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", collectorId));

        if (!Boolean.TRUE.equals(collector.getIsActive())) {
            throw new BadRequestException("Collector account is inactive.");
        }

        // Create Payment Record
        Payment payment = Payment.builder()
                .distribution(distribution)
                .amount(distribution.getTotalAmount())
                .paymentMethod(method)
                .paymentStatus("COMPLETED")
                .collector(collector)
                .paymentDate(LocalDateTime.now())
                .referenceNumber(request.getReferenceNumber())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Update Distribution Status
        distribution.setPaymentStatus("PAID");
        distributionRepository.save(distribution);

        // Generate Digital Receipt
        String receiptNumber = ReceiptNumberGenerator.generateReceiptNumber();
        Receipt receipt = Receipt.builder()
                .receiptNumber(receiptNumber)
                .payment(savedPayment)
                .issuedAt(LocalDateTime.now())
                .build();

        receiptRepository.save(receipt);

        return mapToPaymentResponse(savedPayment, receiptNumber);
    }

    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", id));

        String receiptNumber = receiptRepository.findByPaymentId(payment.getId())
                .map(Receipt::getReceiptNumber)
                .orElse(null);

        return mapToPaymentResponse(payment, receiptNumber);
    }

    public PagedResponse<PaymentResponse> getAllPayments(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "paymentDate"));
        Page<Payment> paymentPage = paymentRepository.findAllByOrderByPaymentDateDesc(pageable);

        List<PaymentResponse> content = paymentPage.getContent().stream()
                .map(p -> {
                    String receiptNumber = receiptRepository.findByPaymentId(p.getId())
                            .map(Receipt::getReceiptNumber)
                            .orElse(null);
                    return mapToPaymentResponse(p, receiptNumber);
                })
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

    public ReceiptDto getReceiptByIdOrNumber(String identifier) {
        Receipt receipt;
        try {
            Long id = Long.parseLong(identifier);
            receipt = receiptRepository.findById(id)
                    .orElseGet(() -> receiptRepository.findByReceiptNumber(identifier)
                            .orElseThrow(() -> new ResourceNotFoundException("Receipt", "identifier", identifier)));
        } catch (NumberFormatException e) {
            receipt = receiptRepository.findByReceiptNumber(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Receipt", "receiptNumber", identifier));
        }

        Payment payment = receipt.getPayment();
        WaterDistribution distribution = payment.getDistribution();
        Customer customer = distribution.getCustomer();

        return ReceiptDto.builder()
                .id(receipt.getId())
                .receiptNumber(receipt.getReceiptNumber())
                .customerCode(customer.getCustomerCode())
                .customerName(customer.getFullName())
                .customerAddress(customer.getAddress())
                .customerPhone(customer.getPhoneNumber())
                .villageName(customer.getVillage().getName())
                .quantityLitres(distribution.getQuantityLitres())
                .pricePerLitre(distribution.getPricePerLitre())
                .totalAmount(distribution.getTotalAmount())
                .paymentMethod(payment.getPaymentMethod())
                .referenceNumber(payment.getReferenceNumber())
                .collectorName(payment.getCollector().getFullName())
                .issuedAt(receipt.getIssuedAt())
                .build();
    }

    public BigDecimal getTodaysCollectionForCollector() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        try {
            Long collectorId = SecurityUtils.getCurrentUserId();
            if (collectorId != null) {
                BigDecimal collectorSum = paymentRepository.sumCollectorPaymentsBetween(collectorId, startOfDay, endOfDay);
                if (collectorSum != null && collectorSum.compareTo(BigDecimal.ZERO) > 0) {
                    return collectorSum;
                }
            }
        } catch (Exception ignored) {}

        return paymentRepository.sumPaymentsBetween(startOfDay, endOfDay);
    }

    private PaymentResponse mapToPaymentResponse(Payment p, String receiptNumber) {
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
                .receiptNumber(receiptNumber)
                .build();
    }
}
