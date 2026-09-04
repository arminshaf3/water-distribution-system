package com.water.distribution.controller;

import com.water.distribution.dto.ApiResponse;
import com.water.distribution.dto.WaterPriceDto;
import com.water.distribution.service.WaterPriceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/water-prices")
public class WaterPriceController {

    private final WaterPriceService waterPriceService;

    public WaterPriceController(WaterPriceService waterPriceService) {
        this.waterPriceService = waterPriceService;
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'COLLECTOR')")
    public ResponseEntity<ApiResponse<WaterPriceDto>> getActiveWaterPrice() {
        WaterPriceDto activePrice = waterPriceService.getActiveWaterPrice();
        return ResponseEntity.ok(ApiResponse.success("Active water price fetched", activePrice));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<WaterPriceDto>>> getPriceHistory() {
        List<WaterPriceDto> history = waterPriceService.getPriceHistory();
        return ResponseEntity.ok(ApiResponse.success("Price history retrieved", history));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WaterPriceDto>> updateWaterPrice(@Valid @RequestBody WaterPriceDto priceDto) {
        WaterPriceDto updated = waterPriceService.createNewPriceRate(priceDto);
        return ResponseEntity.ok(ApiResponse.success("Water price rate updated successfully", updated));
    }
}
