package com.water.distribution.controller;

import com.water.distribution.dto.*;
import com.water.distribution.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping({"/api/v1/customers", "/api/customers"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<CustomerDto>>> getCustomers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "villageId", required = false) Long villageId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<CustomerDto> response = customerService.getCustomers(search, villageId, status, page, size);
        return ResponseEntity.ok(ApiResponse.success("Customers retrieved successfully", response));
    }

    @GetMapping({"/api/v1/customers/{id}", "/api/customers/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<CustomerDto>> getCustomerById(@PathVariable Long id) {
        CustomerDto customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(ApiResponse.success("Customer details retrieved successfully", customer));
    }

    @PostMapping({"/api/v1/customers", "/api/customers"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<CustomerDto>> createCustomer(@Valid @RequestBody CustomerDto customerDto) {
        CustomerDto created = customerService.createCustomer(customerDto);
        return ResponseEntity.ok(ApiResponse.success("Customer registered successfully", created));
    }

    @PutMapping({"/api/v1/customers/{id}", "/api/customers/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<CustomerDto>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerDto customerDto) {
        CustomerDto updated = customerService.updateCustomer(id, customerDto);
        return ResponseEntity.ok(ApiResponse.success("Customer details updated successfully", updated));
    }

    @PatchMapping({"/api/v1/customers/{id}/status", "/api/customers/{id}/status"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CustomerDto>> toggleCustomerStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> statusMap) {
        String status = statusMap != null ? statusMap.get("status") : null;
        CustomerDto updated = customerService.toggleCustomerStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Customer status updated successfully", updated));
    }

    @GetMapping({"/api/v1/customers/{id}/distributions", "/api/customers/{id}/distributions"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<DistributionResponse>>> getCustomerDistributions(
            @PathVariable Long id,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<DistributionResponse> response = customerService.getCustomerDistributions(id, page, size);
        return ResponseEntity.ok(ApiResponse.success("Customer distribution history retrieved successfully", response));
    }

    @GetMapping({"/api/v1/customers/{id}/payments", "/api/customers/{id}/payments"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<PaymentResponse>>> getCustomerPayments(
            @PathVariable Long id,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<PaymentResponse> response = customerService.getCustomerPayments(id, page, size);
        return ResponseEntity.ok(ApiResponse.success("Customer payment history retrieved successfully", response));
    }
}
