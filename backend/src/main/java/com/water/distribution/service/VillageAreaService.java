package com.water.distribution.service;

import com.water.distribution.dto.VillageDto;
import com.water.distribution.entity.VillageArea;
import com.water.distribution.exception.BadRequestException;
import com.water.distribution.exception.ResourceNotFoundException;
import com.water.distribution.repository.VillageAreaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class VillageAreaService {

    private final VillageAreaRepository villageAreaRepository;

    public VillageAreaService(VillageAreaRepository villageAreaRepository) {
        this.villageAreaRepository = villageAreaRepository;
    }

    public List<VillageDto> getAllActiveVillages() {
        return villageAreaRepository.findByIsActiveTrue().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<VillageDto> getAllVillages() {
        return villageAreaRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public VillageDto getVillageById(Long id) {
        VillageArea village = villageAreaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VillageArea", "id", id));
        return mapToDto(village);
    }

    @Transactional
    public VillageDto createVillage(VillageDto villageDto) {
        if (villageAreaRepository.existsByCode(villageDto.getCode())) {
            throw new BadRequestException("Village code '" + villageDto.getCode() + "' already exists");
        }
        if (villageAreaRepository.existsByName(villageDto.getName())) {
            throw new BadRequestException("Village name '" + villageDto.getName() + "' already exists");
        }

        VillageArea village = VillageArea.builder()
                .name(villageDto.getName())
                .code(villageDto.getCode())
                .description(villageDto.getDescription())
                .isActive(true)
                .build();

        VillageArea saved = villageAreaRepository.save(village);
        return mapToDto(saved);
    }

    @Transactional
    public VillageDto updateVillage(Long id, VillageDto villageDto) {
        VillageArea village = villageAreaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VillageArea", "id", id));

        if (!village.getCode().equals(villageDto.getCode()) && villageAreaRepository.existsByCode(villageDto.getCode())) {
            throw new BadRequestException("Village code '" + villageDto.getCode() + "' already exists");
        }
        if (!village.getName().equals(villageDto.getName()) && villageAreaRepository.existsByName(villageDto.getName())) {
            throw new BadRequestException("Village name '" + villageDto.getName() + "' already exists");
        }

        village.setName(villageDto.getName());
        village.setCode(villageDto.getCode());
        village.setDescription(villageDto.getDescription());

        VillageArea updated = villageAreaRepository.save(village);
        return mapToDto(updated);
    }

    @Transactional
    public VillageDto toggleVillageStatus(Long id, Boolean active) {
        VillageArea village = villageAreaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VillageArea", "id", id));

        boolean newStatus = active != null ? active : !Boolean.TRUE.equals(village.getIsActive());
        village.setIsActive(newStatus);

        VillageArea updated = villageAreaRepository.save(village);
        return mapToDto(updated);
    }

    private VillageDto mapToDto(VillageArea village) {
        return VillageDto.builder()
                .id(village.getId())
                .name(village.getName())
                .code(village.getCode())
                .description(village.getDescription())
                .isActive(village.getIsActive())
                .createdAt(village.getCreatedAt())
                .build();
    }
}
