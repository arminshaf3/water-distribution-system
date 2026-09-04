package com.water.distribution.dto;

import java.math.BigDecimal;
import java.util.List;

public class ReportSummaryDto {
    private BigDecimal totalLitres;
    private long totalTransactions;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal pendingAmount;

    private List<GroupBreakdownStat> customerBreakdown;
    private List<GroupBreakdownStat> collectorBreakdown;
    private List<GroupBreakdownStat> villageBreakdown;

    public ReportSummaryDto() {}

    public ReportSummaryDto(BigDecimal totalLitres, long totalTransactions, BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal pendingAmount, List<GroupBreakdownStat> customerBreakdown, List<GroupBreakdownStat> collectorBreakdown, List<GroupBreakdownStat> villageBreakdown) {
        this.totalLitres = totalLitres;
        this.totalTransactions = totalTransactions;
        this.totalAmount = totalAmount;
        this.paidAmount = paidAmount;
        this.pendingAmount = pendingAmount;
        this.customerBreakdown = customerBreakdown;
        this.collectorBreakdown = collectorBreakdown;
        this.villageBreakdown = villageBreakdown;
    }

    public BigDecimal getTotalLitres() { return totalLitres; }
    public void setTotalLitres(BigDecimal totalLitres) { this.totalLitres = totalLitres; }

    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getPendingAmount() { return pendingAmount; }
    public void setPendingAmount(BigDecimal pendingAmount) { this.pendingAmount = pendingAmount; }

    public List<GroupBreakdownStat> getCustomerBreakdown() { return customerBreakdown; }
    public void setCustomerBreakdown(List<GroupBreakdownStat> customerBreakdown) { this.customerBreakdown = customerBreakdown; }

    public List<GroupBreakdownStat> getCollectorBreakdown() { return collectorBreakdown; }
    public void setCollectorBreakdown(List<GroupBreakdownStat> collectorBreakdown) { this.collectorBreakdown = collectorBreakdown; }

    public List<GroupBreakdownStat> getVillageBreakdown() { return villageBreakdown; }
    public void setVillageBreakdown(List<GroupBreakdownStat> villageBreakdown) { this.villageBreakdown = villageBreakdown; }

    public static class GroupBreakdownStat {
        private String groupName;
        private long transactionsCount;
        private BigDecimal totalLitres;
        private BigDecimal totalAmount;

        public GroupBreakdownStat() {}

        public GroupBreakdownStat(String groupName, long transactionsCount, BigDecimal totalLitres, BigDecimal totalAmount) {
            this.groupName = groupName;
            this.transactionsCount = transactionsCount;
            this.totalLitres = totalLitres;
            this.totalAmount = totalAmount;
        }

        public String getGroupName() { return groupName; }
        public void setGroupName(String groupName) { this.groupName = groupName; }

        public long getTransactionsCount() { return transactionsCount; }
        public void setTransactionsCount(long transactionsCount) { this.transactionsCount = transactionsCount; }

        public BigDecimal getTotalLitres() { return totalLitres; }
        public void setTotalLitres(BigDecimal totalLitres) { this.totalLitres = totalLitres; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    public static ReportSummaryDtoBuilder builder() { return new ReportSummaryDtoBuilder(); }

    public static class ReportSummaryDtoBuilder {
        private BigDecimal totalLitres;
        private long totalTransactions;
        private BigDecimal totalAmount;
        private BigDecimal paidAmount;
        private BigDecimal pendingAmount;
        private List<GroupBreakdownStat> customerBreakdown;
        private List<GroupBreakdownStat> collectorBreakdown;
        private List<GroupBreakdownStat> villageBreakdown;

        public ReportSummaryDtoBuilder totalLitres(BigDecimal totalLitres) { this.totalLitres = totalLitres; return this; }
        public ReportSummaryDtoBuilder totalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; return this; }
        public ReportSummaryDtoBuilder totalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; return this; }
        public ReportSummaryDtoBuilder paidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; return this; }
        public ReportSummaryDtoBuilder pendingAmount(BigDecimal pendingAmount) { this.pendingAmount = pendingAmount; return this; }
        public ReportSummaryDtoBuilder customerBreakdown(List<GroupBreakdownStat> customerBreakdown) { this.customerBreakdown = customerBreakdown; return this; }
        public ReportSummaryDtoBuilder collectorBreakdown(List<GroupBreakdownStat> collectorBreakdown) { this.collectorBreakdown = collectorBreakdown; return this; }
        public ReportSummaryDtoBuilder villageBreakdown(List<GroupBreakdownStat> villageBreakdown) { this.villageBreakdown = villageBreakdown; return this; }

        public ReportSummaryDto build() {
            return new ReportSummaryDto(totalLitres, totalTransactions, totalAmount, paidAmount, pendingAmount, customerBreakdown, collectorBreakdown, villageBreakdown);
        }
    }
}
