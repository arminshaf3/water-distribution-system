package com.water.distribution.service;

import com.water.distribution.dto.DashboardStatsResponse;
import com.water.distribution.entity.WaterPrice;
import com.water.distribution.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final WaterDistributionRepository distributionRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final WaterPriceRepository waterPriceRepository;

    public DashboardService(CustomerRepository customerRepository, WaterDistributionRepository distributionRepository, PaymentRepository paymentRepository, UserRepository userRepository, WaterPriceRepository waterPriceRepository) {
        this.customerRepository = customerRepository;
        this.distributionRepository = distributionRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.waterPriceRepository = waterPriceRepository;
    }

    public DashboardStatsResponse getAdminDashboardStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = YearMonth.now().atEndOfMonth().atTime(LocalTime.MAX);

        long totalCustomers = customerRepository.countByStatus("ACTIVE");
        BigDecimal todaysLitres = distributionRepository.sumQuantityBetween(startOfDay, endOfDay);
        BigDecimal todaysCollection = paymentRepository.sumPaymentsBetween(startOfDay, endOfDay);

        BigDecimal monthlyLitres = distributionRepository.sumQuantityBetween(startOfMonth, endOfMonth);
        BigDecimal monthlyCollection = paymentRepository.sumPaymentsBetween(startOfMonth, endOfMonth);

        BigDecimal pendingAmount = distributionRepository.sumPendingPaymentsAmount();
        long pendingCount = distributionRepository.countPendingPayments();
        long activeCollectors = userRepository.findAllActiveCollectors().size();

        BigDecimal activePrice = waterPriceRepository.findCurrentActivePrice()
                .map(WaterPrice::getPricePerLitre)
                .orElse(BigDecimal.ZERO);

        // Daily trend data for past 7 days
        List<DashboardStatsResponse.DailyTrendStat> distributionTrend = new ArrayList<>();
        List<DashboardStatsResponse.DailyTrendStat> collectionTrend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

            BigDecimal distQty = distributionRepository.sumQuantityBetween(dayStart, dayEnd);
            BigDecimal collAmt = paymentRepository.sumPaymentsBetween(dayStart, dayEnd);

            String label = date.format(fmt);
            distributionTrend.add(new DashboardStatsResponse.DailyTrendStat(label, distQty));
            collectionTrend.add(new DashboardStatsResponse.DailyTrendStat(label, collAmt));
        }

        return DashboardStatsResponse.builder()
                .totalCustomers(totalCustomers)
                .todaysLitresDistributed(todaysLitres)
                .todaysAmountCollected(todaysCollection)
                .monthlyLitresDistributed(monthlyLitres)
                .monthlyAmountCollected(monthlyCollection)
                .pendingPaymentsAmount(pendingAmount)
                .pendingPaymentsCount(pendingCount)
                .activeCollectorsCount(activeCollectors)
                .currentWaterPricePerLitre(activePrice)
                .dailyDistributionTrend(distributionTrend)
                .dailyCollectionTrend(collectionTrend)
                .build();
    }
}
