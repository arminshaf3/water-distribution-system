package com.water.distribution.repository;

import com.water.distribution.entity.WaterPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WaterPriceRepository extends JpaRepository<WaterPrice, Long> {

    @Query("SELECT DISTINCT wp FROM WaterPrice wp LEFT JOIN FETCH wp.tiers WHERE wp.isActive = true ORDER BY wp.effectiveFrom DESC")
    List<WaterPrice> findActivePrices();

    default Optional<WaterPrice> findCurrentActivePrice() {
        List<WaterPrice> active = findActivePrices();
        return active.isEmpty() ? Optional.empty() : Optional.of(active.get(0));
    }

    @Query("SELECT DISTINCT wp FROM WaterPrice wp LEFT JOIN FETCH wp.tiers ORDER BY wp.effectiveFrom DESC")
    List<WaterPrice> findAllByOrderByEffectiveFromDesc();
}
