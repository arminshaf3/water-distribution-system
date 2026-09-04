package com.water.distribution.controller;

import com.water.distribution.dto.*;
import com.water.distribution.security.UserPrincipal;
import com.water.distribution.service.AuthService;
import com.water.distribution.util.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping({"/api/v1/auth/login", "/api/auth/login"})
    public ResponseEntity<ApiResponse<JwtAuthResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping({"/api/v1/auth/refresh", "/api/auth/refresh"})
    public ResponseEntity<ApiResponse<JwtAuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        JwtAuthResponse response = authService.refreshToken(refreshRequest);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @GetMapping({"/api/v1/auth/me", "/api/auth/me"})
    public ResponseEntity<ApiResponse<UserPrincipal>> getCurrentUser() {
        UserPrincipal userPrincipal = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success("User context fetched", userPrincipal));
    }

    @PostMapping({"/api/v1/auth/collectors", "/api/auth/collectors", "/api/v1/auth/register/collector", "/api/auth/register/collector"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> registerCollector(@Valid @RequestBody UserDto userDto) {
        UserDto created = authService.registerCollector(userDto);
        return ResponseEntity.ok(ApiResponse.success("Collector account created successfully", created));
    }

    @GetMapping({"/api/v1/auth/collectors", "/api/auth/collectors"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllCollectors() {
        List<UserDto> collectors = authService.getAllCollectors();
        return ResponseEntity.ok(ApiResponse.success("Collectors retrieved successfully", collectors));
    }
}
