package com.water.distribution.repository;

import com.water.distribution.entity.VillageArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VillageAreaRepository extends JpaRepository<VillageArea, Long> {
    Optional<VillageArea> findByCode(String code);
    Boolean existsByName(String name);
    Boolean existsByCode(String code);
    List<VillageArea> findByIsActiveTrue();
}
