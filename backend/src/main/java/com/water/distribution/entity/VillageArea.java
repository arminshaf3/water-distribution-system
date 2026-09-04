package com.water.distribution.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "villages")
public class VillageArea extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public VillageArea() {}

    public VillageArea(Long id, String name, String code, String description, Boolean isActive) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.description = description;
        this.isActive = isActive != null ? isActive : true;
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

    public String getStatus() { return Boolean.TRUE.equals(isActive) ? "ACTIVE" : "INACTIVE"; }

    public static VillageAreaBuilder builder() { return new VillageAreaBuilder(); }

    public static class VillageAreaBuilder {
        private Long id;
        private String name;
        private String code;
        private String description;
        private Boolean isActive = true;

        public VillageAreaBuilder id(Long id) { this.id = id; return this; }
        public VillageAreaBuilder name(String name) { this.name = name; return this; }
        public VillageAreaBuilder code(String code) { this.code = code; return this; }
        public VillageAreaBuilder description(String description) { this.description = description; return this; }
        public VillageAreaBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }

        public VillageArea build() {
            return new VillageArea(id, name, code, description, isActive);
        }
    }
}
