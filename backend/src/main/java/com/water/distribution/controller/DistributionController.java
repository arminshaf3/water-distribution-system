package com.water.distribution.controller;

import com.water.distribution.dto.ApiResponse;
import com.water.distribution.dto.DistributionRequest;
import com.water.distribution.dto.DistributionResponse;
import com.water.distribution.dto.PagedResponse;
import com.water.distribution.service.DistributionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping
public class DistributionController {

    private final DistributionService distributionService;

    public DistributionController(DistributionService distributionService) {
        this.distributionService = distributionService;
    }

    @PostMapping({"/api/v1/distributions", "/api/distributions"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<DistributionResponse>> recordDistribution(
            @Valid @RequestBody DistributionRequest request) {
        DistributionResponse response = distributionService.recordDistribution(request);
        return ResponseEntity.ok(ApiResponse.success("Water distribution recorded successfully", response));
    }

    @GetMapping({"/api/v1/distributions/{id}", "/api/distributions/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<DistributionResponse>> getDistributionById(@PathVariable Long id) {
        DistributionResponse response = distributionService.getDistributionById(id);
        return ResponseEntity.ok(ApiResponse.success("Distribution details retrieved successfully", response));
    }

    @GetMapping({"/api/v1/distributions", "/api/distributions"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<DistributionResponse>>> getDistributions(
            @RequestParam(value = "customerId", required = false) Long customerId,
            @RequestParam(value = "collectorId", required = false) Long collectorId,
            @RequestParam(value = "paymentStatus", required = false) String paymentStatus,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<DistributionResponse> response = distributionService.getDistributions(
                customerId, collectorId, paymentStatus, startDate, endDate, page, size);
        return ResponseEntity.ok(ApiResponse.success("Distributions retrieved successfully", response));
    }

    @GetMapping({"/api/v1/distributions/my-history", "/api/distributions/my-history"})
    @PreAuthorize("hasRole('COLLECTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<DistributionResponse>>> getMyDistributions(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<DistributionResponse> response = distributionService.getMyDistributions(page, size);
        return ResponseEntity.ok(ApiResponse.success("Your distribution history retrieved successfully", response));
    }
}
