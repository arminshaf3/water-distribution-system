package com.water.distribution.repository;

import com.water.distribution.entity.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    Optional<Receipt> findByReceiptNumber(String receiptNumber);
    Optional<Receipt> findByPaymentId(Long paymentId);
    Optional<Receipt> findByPaymentDistributionId(Long distributionId);
    Boolean existsByReceiptNumber(String receiptNumber);
}
