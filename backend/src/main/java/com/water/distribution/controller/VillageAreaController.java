package com.water.distribution.controller;

import com.water.distribution.dto.ApiResponse;
import com.water.distribution.dto.VillageDto;
import com.water.distribution.service.VillageAreaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class VillageAreaController {

    private final VillageAreaService villageAreaService;

    public VillageAreaController(VillageAreaService villageAreaService) {
        this.villageAreaService = villageAreaService;
    }

    @GetMapping({"/api/v1/villages", "/api/villages"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<List<VillageDto>>> getVillages(
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly) {
        List<VillageDto> villages = activeOnly ? 
                villageAreaService.getAllActiveVillages() : 
                villageAreaService.getAllVillages();
        return ResponseEntity.ok(ApiResponse.success("Villages retrieved successfully", villages));
    }

    @GetMapping({"/api/v1/villages/{id}", "/api/villages/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<VillageDto>> getVillageById(@PathVariable Long id) {
        VillageDto village = villageAreaService.getVillageById(id);
        return ResponseEntity.ok(ApiResponse.success("Village details retrieved successfully", village));
    }

    @PostMapping({"/api/v1/villages", "/api/villages"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VillageDto>> createVillage(@Valid @RequestBody VillageDto villageDto) {
        VillageDto created = villageAreaService.createVillage(villageDto);
        return ResponseEntity.ok(ApiResponse.success("Village created successfully", created));
    }

    @PutMapping({"/api/v1/villages/{id}", "/api/villages/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VillageDto>> updateVillage(
            @PathVariable Long id,
            @Valid @RequestBody VillageDto villageDto) {
        VillageDto updated = villageAreaService.updateVillage(id, villageDto);
        return ResponseEntity.ok(ApiResponse.success("Village updated successfully", updated));
    }

    @PatchMapping({"/api/v1/villages/{id}/status", "/api/villages/{id}/status"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VillageDto>> toggleVillageStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> statusMap) {
        Boolean active = statusMap != null ? statusMap.get("active") : null;
        VillageDto updated = villageAreaService.toggleVillageStatus(id, active);
        return ResponseEntity.ok(ApiResponse.success("Village status updated successfully", updated));
    }
}
