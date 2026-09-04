package com.water.distribution.service;

import com.water.distribution.dto.ReportSummaryDto;
import com.water.distribution.dto.ReportSummaryDto.GroupBreakdownStat;
import com.water.distribution.entity.WaterDistribution;
import com.water.distribution.repository.WaterDistributionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final WaterDistributionRepository distributionRepository;

    public ReportService(WaterDistributionRepository distributionRepository) {
        this.distributionRepository = distributionRepository;
    }

    public ReportSummaryDto getReportSummary(Long customerId, Long collectorId, Long villageId,
                                             String paymentStatus, LocalDateTime startDate, LocalDateTime endDate) {
        Pageable pageable = PageRequest.of(0, 10000);
        List<WaterDistribution> distributions = distributionRepository.filterDistributions(
                customerId, collectorId, paymentStatus, startDate, endDate, pageable).getContent();

        // If villageId filter is passed, manually filter by village
        if (villageId != null) {
            distributions = distributions.stream()
                    .filter(d -> d.getCustomer().getVillage() != null && villageId.equals(d.getCustomer().getVillage().getId()))
                    .collect(Collectors.toList());
        }

        BigDecimal totalLitres = distributions.stream()
                .map(WaterDistribution::getQuantityLitres)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAmount = distributions.stream()
                .map(WaterDistribution::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal paidAmount = distributions.stream()
                .filter(d -> "PAID".equalsIgnoreCase(d.getPaymentStatus()))
                .map(WaterDistribution::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingAmount = distributions.stream()
                .filter(d -> "PENDING".equalsIgnoreCase(d.getPaymentStatus()))
                .map(WaterDistribution::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Group by Customer
        Map<String, List<WaterDistribution>> byCustomer = distributions.stream()
                .collect(Collectors.groupingBy(d -> d.getCustomer().getFullName() + " (" + d.getCustomer().getCustomerCode() + ")"));

        List<GroupBreakdownStat> customerBreakdown = byCustomer.entrySet().stream()
                .map(e -> new GroupBreakdownStat(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream().map(WaterDistribution::getQuantityLitres).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().stream().map(WaterDistribution::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(GroupBreakdownStat::getTotalAmount).reversed())
                .collect(Collectors.toList());

        // Group by Collector
        Map<String, List<WaterDistribution>> byCollector = distributions.stream()
                .collect(Collectors.groupingBy(d -> d.getCollector().getFullName()));

        List<GroupBreakdownStat> collectorBreakdown = byCollector.entrySet().stream()
                .map(e -> new GroupBreakdownStat(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream().map(WaterDistribution::getQuantityLitres).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().stream().map(WaterDistribution::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(GroupBreakdownStat::getTotalAmount).reversed())
                .collect(Collectors.toList());

        // Group by Village
        Map<String, List<WaterDistribution>> byVillage = distributions.stream()
                .collect(Collectors.groupingBy(d -> d.getCustomer().getVillage().getName()));

        List<GroupBreakdownStat> villageBreakdown = byVillage.entrySet().stream()
                .map(e -> new GroupBreakdownStat(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream().map(WaterDistribution::getQuantityLitres).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().stream().map(WaterDistribution::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(GroupBreakdownStat::getTotalAmount).reversed())
                .collect(Collectors.toList());

        return ReportSummaryDto.builder()
                .totalLitres(totalLitres)
                .totalTransactions(distributions.size())
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .pendingAmount(pendingAmount)
                .customerBreakdown(customerBreakdown)
                .collectorBreakdown(collectorBreakdown)
                .villageBreakdown(villageBreakdown)
                .build();
    }

    public String generateCsvReport(Long customerId, Long collectorId, Long villageId,
                                    String paymentStatus, LocalDateTime startDate, LocalDateTime endDate) {
        Pageable pageable = PageRequest.of(0, 10000);
        List<WaterDistribution> distributions = distributionRepository.filterDistributions(
                customerId, collectorId, paymentStatus, startDate, endDate, pageable).getContent();

        if (villageId != null) {
            distributions = distributions.stream()
                    .filter(d -> d.getCustomer().getVillage() != null && villageId.equals(d.getCustomer().getVillage().getId()))
                    .collect(Collectors.toList());
        }

        StringBuilder csv = new StringBuilder();
        csv.append("Transaction Code,Customer Code,Customer Name,Village,Collector,Litres,Rate (Rs/L),Total Amount (Rs),Payment Status,Date\n");

        for (WaterDistribution d : distributions) {
            csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%.2f,%.2f,%.2f,\"%s\",\"%s\"\n",
                    d.getDistributionCode(),
                    d.getCustomer().getCustomerCode(),
                    d.getCustomer().getFullName().replace("\"", "\"\""),
                    d.getCustomer().getVillage().getName().replace("\"", "\"\""),
                    d.getCollector().getFullName().replace("\"", "\"\""),
                    d.getQuantityLitres(),
                    d.getPricePerLitre(),
                    d.getTotalAmount(),
                    d.getPaymentStatus(),
                    d.getDistributionDate().toString()
            ));
        }

        return csv.toString();
    }
}
