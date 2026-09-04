package com.water.distribution.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class VillageDto {
    private Long id;

    @NotBlank(message = "Village name is required")
    private String name;

    @NotBlank(message = "Village code is required")
    private String code;

    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public VillageDto() {}

    public VillageDto(Long id, String name, String code, String description, Boolean isActive, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.description = description;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static VillageDtoBuilder builder() { return new VillageDtoBuilder(); }

    public static class VillageDtoBuilder {
        private Long id;
        private String name;
        private String code;
        private String description;
        private Boolean isActive;
        private LocalDateTime createdAt;

        public VillageDtoBuilder id(Long id) { this.id = id; return this; }
        public VillageDtoBuilder name(String name) { this.name = name; return this; }
        public VillageDtoBuilder code(String code) { this.code = code; return this; }
        public VillageDtoBuilder description(String description) { this.description = description; return this; }
        public VillageDtoBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public VillageDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public VillageDto build() {
            return new VillageDto(id, name, code, description, isActive, createdAt);
        }
    }
}
