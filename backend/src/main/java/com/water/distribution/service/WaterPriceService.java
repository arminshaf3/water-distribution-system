package com.water.distribution.service;

import com.water.distribution.dto.WaterPriceDto;
import com.water.distribution.dto.WaterPriceDto.PriceTierDto;
import com.water.distribution.entity.User;
import com.water.distribution.entity.WaterPrice;
import com.water.distribution.entity.WaterPriceTier;
import com.water.distribution.exception.BadRequestException;
import com.water.distribution.exception.ResourceNotFoundException;
import com.water.distribution.repository.UserRepository;
import com.water.distribution.repository.WaterPriceRepository;
import com.water.distribution.util.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WaterPriceService {

    private final WaterPriceRepository waterPriceRepository;
    private final UserRepository userRepository;

    public WaterPriceService(WaterPriceRepository waterPriceRepository, UserRepository userRepository) {
        this.waterPriceRepository = waterPriceRepository;
        this.userRepository = userRepository;
    }

    public WaterPriceDto getActiveWaterPrice() {
        WaterPrice activePrice = waterPriceRepository.findCurrentActivePrice()
                .orElseThrow(() -> new ResourceNotFoundException("WaterPrice", "status", "ACTIVE"));

        return mapToDto(activePrice);
    }

    public List<WaterPriceDto> getPriceHistory() {
        return waterPriceRepository.findAllByOrderByEffectiveFromDesc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public WaterPriceDto createNewPriceRate(WaterPriceDto priceDto) {
        if (priceDto.getPricePerLitre() == null || priceDto.getPricePerLitre().signum() <= 0) {
            throw new BadRequestException("Price per litre must be a positive number");
        }

        // Deactivate old active prices
        List<WaterPrice> activePrices = waterPriceRepository.findActivePrices();
        for (WaterPrice price : activePrices) {
            price.setIsActive(false);
            waterPriceRepository.save(price);
        }

        Long currentUserId = SecurityUtils.getCurrentUserId();
        User creator = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;

        WaterPrice newPrice = WaterPrice.builder()
                .pricePerLitre(priceDto.getPricePerLitre())
                .effectiveFrom(LocalDateTime.now())
                .isActive(true)
                .notes(priceDto.getNotes())
                .createdBy(creator)
                .build();

        if (priceDto.getTiers() != null && !priceDto.getTiers().isEmpty()) {
            for (PriceTierDto tierDto : priceDto.getTiers()) {
                WaterPriceTier tier = WaterPriceTier.builder()
                        .waterPrice(newPrice)
                        .tierName(tierDto.getTierName() != null ? tierDto.getTierName() : "Slab Rate")
                        .minLitres(tierDto.getMinLitres() != null ? tierDto.getMinLitres() : java.math.BigDecimal.ZERO)
                        .maxLitres(tierDto.getMaxLitres())
                        .pricePerLitre(tierDto.getPricePerLitre())
                        .build();
                newPrice.getTiers().add(tier);
            }
        }

        return mapToDto(waterPriceRepository.save(newPrice));
    }

    private WaterPriceDto mapToDto(WaterPrice waterPrice) {
        List<PriceTierDto> tierDtos = waterPrice.getTiers() != null ?
                waterPrice.getTiers().stream()
                        .map(t -> new PriceTierDto(t.getTierName(), t.getMinLitres(), t.getMaxLitres(), t.getPricePerLitre()))
                        .collect(Collectors.toList()) : null;

        return WaterPriceDto.builder()
                .id(waterPrice.getId())
                .pricePerLitre(waterPrice.getPricePerLitre())
                .effectiveFrom(waterPrice.getEffectiveFrom())
                .isActive(waterPrice.getIsActive())
                .notes(waterPrice.getNotes())
                .createdByName(waterPrice.getCreatedBy() != null ? waterPrice.getCreatedBy().getFullName() : "System")
                .createdAt(waterPrice.getCreatedAt())
                .tiers(tierDtos)
                .build();
    }
}
