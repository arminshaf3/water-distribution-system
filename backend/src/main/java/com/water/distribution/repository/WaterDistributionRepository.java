package com.water.distribution.repository;

import com.water.distribution.entity.WaterDistribution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WaterDistributionRepository extends JpaRepository<WaterDistribution, Long> {

    Page<WaterDistribution> findByCustomerId(Long customerId, Pageable pageable);

    Page<WaterDistribution> findByCollectorId(Long collectorId, Pageable pageable);

    @Query("SELECT d FROM WaterDistribution d WHERE " +
           "(:customerId IS NULL OR :customerId = 0 OR d.customer.id = :customerId) AND " +
           "(:collectorId IS NULL OR :collectorId = 0 OR d.collector.id = :collectorId) AND " +
           "(:paymentStatus IS NULL OR :paymentStatus = '' OR :paymentStatus = 'ALL' OR d.paymentStatus = :paymentStatus) AND " +
           "(:startDate IS NULL OR d.distributionDate >= :startDate) AND " +
           "(:endDate IS NULL OR d.distributionDate <= :endDate)")
    Page<WaterDistribution> filterDistributions(
            @Param("customerId") Long customerId,
            @Param("collectorId") Long collectorId,
            @Param("paymentStatus") String paymentStatus,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(d.quantityLitres), 0) FROM WaterDistribution d WHERE d.distributionDate >= :start AND d.distributionDate <= :end")
    BigDecimal sumQuantityBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(d.totalAmount), 0) FROM WaterDistribution d WHERE d.paymentStatus = 'PENDING'")
    BigDecimal sumPendingPaymentsAmount();

    @Query("SELECT COUNT(d) FROM WaterDistribution d WHERE d.paymentStatus = 'PENDING'")
    long countPendingPayments();
}
