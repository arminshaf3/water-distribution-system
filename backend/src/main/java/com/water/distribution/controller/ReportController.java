package com.water.distribution.controller;

import com.water.distribution.dto.ApiResponse;
import com.water.distribution.dto.ReportSummaryDto;
import com.water.distribution.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping({"/api/v1/reports/summary", "/api/reports/summary"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportSummaryDto>> getReportSummary(
            @RequestParam(value = "customerId", required = false) Long customerId,
            @RequestParam(value = "collectorId", required = false) Long collectorId,
            @RequestParam(value = "villageId", required = false) Long villageId,
            @RequestParam(value = "paymentStatus", required = false) String paymentStatus,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        ReportSummaryDto summary = reportService.getReportSummary(customerId, collectorId, villageId, paymentStatus, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Report summary computed successfully", summary));
    }

    @GetMapping({"/api/v1/reports/export/csv", "/api/reports/export/csv"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportCsvReport(
            @RequestParam(value = "customerId", required = false) Long customerId,
            @RequestParam(value = "collectorId", required = false) Long collectorId,
            @RequestParam(value = "villageId", required = false) Long villageId,
            @RequestParam(value = "paymentStatus", required = false) String paymentStatus,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        String csvData = reportService.generateCsvReport(customerId, collectorId, villageId, paymentStatus, startDate, endDate);
        byte[] output = csvData.getBytes();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "water_distribution_report.csv");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok().headers(headers).body(output);
    }
}
