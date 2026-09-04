package com.water.distribution.controller;

import com.water.distribution.dto.*;
import com.water.distribution.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping({"/api/v1/payments", "/api/payments"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(request);
        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", response));
    }

    @GetMapping({"/api/v1/payments/{id}", "/api/payments/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(@PathVariable Long id) {
        PaymentResponse response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(ApiResponse.success("Payment details retrieved successfully", response));
    }

    @GetMapping({"/api/v1/payments", "/api/payments"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<PaymentResponse>>> getAllPayments(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<PaymentResponse> response = paymentService.getAllPayments(page, size);
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved successfully", response));
    }

    @GetMapping({"/api/v1/payments/today", "/api/payments/today"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<BigDecimal>> getTodaysCollectionForCollector() {
        BigDecimal total = paymentService.getTodaysCollectionForCollector();
        return ResponseEntity.ok(ApiResponse.success("Today's total collection retrieved", total));
    }

    @GetMapping({"/api/v1/receipts/{identifier}", "/api/receipts/{identifier}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<ReceiptDto>> getReceiptByIdOrNumber(@PathVariable String identifier) {
        ReceiptDto receipt = paymentService.getReceiptByIdOrNumber(identifier);
        return ResponseEntity.ok(ApiResponse.success("Receipt retrieved successfully", receipt));
    }
}
