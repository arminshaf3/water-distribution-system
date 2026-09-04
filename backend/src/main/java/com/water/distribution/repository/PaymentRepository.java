package com.water.distribution.repository;

import com.water.distribution.entity.Payment;
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
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentStatus = 'COMPLETED' AND p.paymentDate >= :start AND p.paymentDate <= :end")
    BigDecimal sumPaymentsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.collector.id = :collectorId AND p.paymentStatus = 'COMPLETED' AND p.paymentDate >= :start AND p.paymentDate <= :end")
    BigDecimal sumCollectorPaymentsBetween(@Param("collectorId") Long collectorId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    Page<Payment> findByDistributionCustomerId(Long customerId, Pageable pageable);

    Page<Payment> findByCollectorIdOrderByPaymentDateDesc(Long collectorId, Pageable pageable);

    Page<Payment> findAllByOrderByPaymentDateDesc(Pageable pageable);
}
