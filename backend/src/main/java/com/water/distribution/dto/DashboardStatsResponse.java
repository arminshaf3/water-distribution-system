package com.water.distribution.dto;

import java.math.BigDecimal;
import java.util.List;

public class DashboardStatsResponse {
    private long totalCustomers;
    private BigDecimal todaysLitresDistributed;
    private BigDecimal todaysAmountCollected;
    private BigDecimal monthlyLitresDistributed;
    private BigDecimal monthlyAmountCollected;
    private BigDecimal pendingPaymentsAmount;
    private long pendingPaymentsCount;
    private long activeCollectorsCount;
    private BigDecimal currentWaterPricePerLitre;

    private List<DailyTrendStat> dailyDistributionTrend;
    private List<DailyTrendStat> dailyCollectionTrend;

    public DashboardStatsResponse() {}

    public DashboardStatsResponse(long totalCustomers, BigDecimal todaysLitresDistributed, BigDecimal todaysAmountCollected, BigDecimal monthlyLitresDistributed, BigDecimal monthlyAmountCollected, BigDecimal pendingPaymentsAmount, long pendingPaymentsCount, long activeCollectorsCount, BigDecimal currentWaterPricePerLitre, List<DailyTrendStat> dailyDistributionTrend, List<DailyTrendStat> dailyCollectionTrend) {
        this.totalCustomers = totalCustomers;
        this.todaysLitresDistributed = todaysLitresDistributed;
        this.todaysAmountCollected = todaysAmountCollected;
        this.monthlyLitresDistributed = monthlyLitresDistributed;
        this.monthlyAmountCollected = monthlyAmountCollected;
        this.pendingPaymentsAmount = pendingPaymentsAmount;
        this.pendingPaymentsCount = pendingPaymentsCount;
        this.activeCollectorsCount = activeCollectorsCount;
        this.currentWaterPricePerLitre = currentWaterPricePerLitre;
        this.dailyDistributionTrend = dailyDistributionTrend;
        this.dailyCollectionTrend = dailyCollectionTrend;
    }

    public long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }

    public BigDecimal getTodaysLitresDistributed() { return todaysLitresDistributed; }
    public void setTodaysLitresDistributed(BigDecimal todaysLitresDistributed) { this.todaysLitresDistributed = todaysLitresDistributed; }

    public BigDecimal getTodaysAmountCollected() { return todaysAmountCollected; }
    public void setTodaysAmountCollected(BigDecimal todaysAmountCollected) { this.todaysAmountCollected = todaysAmountCollected; }

    public BigDecimal getMonthlyLitresDistributed() { return monthlyLitresDistributed; }
    public void setMonthlyLitresDistributed(BigDecimal monthlyLitresDistributed) { this.monthlyLitresDistributed = monthlyLitresDistributed; }

    public BigDecimal getMonthlyAmountCollected() { return monthlyAmountCollected; }
    public void setMonthlyAmountCollected(BigDecimal monthlyAmountCollected) { this.monthlyAmountCollected = monthlyAmountCollected; }

    public BigDecimal getPendingPaymentsAmount() { return pendingPaymentsAmount; }
    public void setPendingPaymentsAmount(BigDecimal pendingPaymentsAmount) { this.pendingPaymentsAmount = pendingPaymentsAmount; }

    public long getPendingPaymentsCount() { return pendingPaymentsCount; }
    public void setPendingPaymentsCount(long pendingPaymentsCount) { this.pendingPaymentsCount = pendingPaymentsCount; }

    public long getActiveCollectorsCount() { return activeCollectorsCount; }
    public void setActiveCollectorsCount(long activeCollectorsCount) { this.activeCollectorsCount = activeCollectorsCount; }

    public BigDecimal getCurrentWaterPricePerLitre() { return currentWaterPricePerLitre; }
    public void setCurrentWaterPricePerLitre(BigDecimal currentWaterPricePerLitre) { this.currentWaterPricePerLitre = currentWaterPricePerLitre; }

    public List<DailyTrendStat> getDailyDistributionTrend() { return dailyDistributionTrend; }
    public void setDailyDistributionTrend(List<DailyTrendStat> dailyDistributionTrend) { this.dailyDistributionTrend = dailyDistributionTrend; }

    public List<DailyTrendStat> getDailyCollectionTrend() { return dailyCollectionTrend; }
    public void setDailyCollectionTrend(List<DailyTrendStat> dailyCollectionTrend) { this.dailyCollectionTrend = dailyCollectionTrend; }

    public static class DailyTrendStat {
        private String date;
        private BigDecimal value;

        public DailyTrendStat() {}

        public DailyTrendStat(String date, BigDecimal value) {
            this.date = date;
            this.value = value;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public BigDecimal getValue() { return value; }
        public void setValue(BigDecimal value) { this.value = value; }
    }

    public static DashboardStatsResponseBuilder builder() { return new DashboardStatsResponseBuilder(); }

    public static class DashboardStatsResponseBuilder {
        private long totalCustomers;
        private BigDecimal todaysLitresDistributed;
        private BigDecimal todaysAmountCollected;
        private BigDecimal monthlyLitresDistributed;
        private BigDecimal monthlyAmountCollected;
        private BigDecimal pendingPaymentsAmount;
        private long pendingPaymentsCount;
        private long activeCollectorsCount;
        private BigDecimal currentWaterPricePerLitre;
        private List<DailyTrendStat> dailyDistributionTrend;
        private List<DailyTrendStat> dailyCollectionTrend;

        public DashboardStatsResponseBuilder totalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; return this; }
        public DashboardStatsResponseBuilder todaysLitresDistributed(BigDecimal todaysLitresDistributed) { this.todaysLitresDistributed = todaysLitresDistributed; return this; }
        public DashboardStatsResponseBuilder todaysAmountCollected(BigDecimal todaysAmountCollected) { this.todaysAmountCollected = todaysAmountCollected; return this; }
        public DashboardStatsResponseBuilder monthlyLitresDistributed(BigDecimal monthlyLitresDistributed) { this.monthlyLitresDistributed = monthlyLitresDistributed; return this; }
        public DashboardStatsResponseBuilder monthlyAmountCollected(BigDecimal monthlyAmountCollected) { this.monthlyAmountCollected = monthlyAmountCollected; return this; }
        public DashboardStatsResponseBuilder pendingPaymentsAmount(BigDecimal pendingPaymentsAmount) { this.pendingPaymentsAmount = pendingPaymentsAmount; return this; }
        public DashboardStatsResponseBuilder pendingPaymentsCount(long pendingPaymentsCount) { this.pendingPaymentsCount = pendingPaymentsCount; return this; }
        public DashboardStatsResponseBuilder activeCollectorsCount(long activeCollectorsCount) { this.activeCollectorsCount = activeCollectorsCount; return this; }
        public DashboardStatsResponseBuilder currentWaterPricePerLitre(BigDecimal currentWaterPricePerLitre) { this.currentWaterPricePerLitre = currentWaterPricePerLitre; return this; }
        public DashboardStatsResponseBuilder dailyDistributionTrend(List<DailyTrendStat> dailyDistributionTrend) { this.dailyDistributionTrend = dailyDistributionTrend; return this; }
        public DashboardStatsResponseBuilder dailyCollectionTrend(List<DailyTrendStat> dailyCollectionTrend) { this.dailyCollectionTrend = dailyCollectionTrend; return this; }

        public DashboardStatsResponse build() {
            return new DashboardStatsResponse(totalCustomers, todaysLitresDistributed, todaysAmountCollected, monthlyLitresDistributed, monthlyAmountCollected, pendingPaymentsAmount, pendingPaymentsCount, activeCollectorsCount, currentWaterPricePerLitre, dailyDistributionTrend, dailyCollectionTrend);
        }
    }
}
