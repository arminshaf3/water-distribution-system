# System Architecture Specification

## Architecture Overview

The **Water Distribution Management System** follows a clean, decoupled client-server architecture.

```
       +-------------------------+             +-------------------------+
       |   Admin Web Dashboard   |             | Collector Mobile App    |
       |  (React + TS + Vite)    |             |    (Flutter + Dart)     |
       +------------+------------+             +------------+------------+
                    |                                       |
                    |           HTTPS REST APIs (JWT)       |
                    +-------------------+-------------------+
                                        |
                                        v
                       +---------------------------------+
                       |     Spring Boot Backend API     |
                       |       (Layered Clean Arch)      |
                       +----------------+----------------+
                                        |
                                        |  Spring Data JPA / Hibernate
                                        v
                       +---------------------------------+
                       |    MySQL / MariaDB Database     |
                       +---------------------------------+
```

## Clean Layered Backend Architecture

The Spring Boot backend adopts a layered architecture:

```
com.water.distribution
├── config/             # CORS, Security, OpenAPI Bean Configurations
├── controller/         # REST API Controllers (Request handling & Validation)
├── dto/                # Request / Response Data Transfer Objects
├── entity/             # JPA Entities mapping database tables
├── exception/          # Global Exception Handler & Domain Exceptions
├── mapper/             # Entity <-> DTO Mapping Layer
├── repository/         # Spring Data JPA Repositories
├── security/           # JWT Provider, Filters, Authentication Manager
├── service/            # Core Business Logic & Pricing Engine
└── util/               # Receipt generator, Security context helpers
```

## Core Principles & Design Patterns

1. **DTO Enforcement**:
   - Database Entities are NEVER returned directly over API responses.
   - All input payloads use explicit, validated DTOs (`@NotNull`, `@NotBlank`, `@Positive`).

2. **Fixed Price per Litre Engine**:
   - The Admin specifies active price per litre stored in `water_prices`.
   - When a collector records water distribution:
     1. The system fetches the current active `WaterPrice`.
     2. Calculates `totalAmount = quantityLitres * pricePerLitre`.
     3. Saves `quantityLitres`, `pricePerLitre` snapshot, and `totalAmount` into `WaterDistribution`.
   - Historical records are immutable with respect to future price updates.

3. **Stateless JWT Security**:
   - Password Hashing: BCrypt password hashing.
   - Bearer Tokens: Issued upon `/api/auth/login`. Expiration configurable via `jwt.expiration-ms`.
   - Role-Based Access Control:
     - `ROLE_ADMIN`: Full management access.
     - `ROLE_COLLECTOR`: Mobile distribution & payment collection endpoints.

4. **Dynamic Database Aggregations**:
   - Dashboard indicators (Total customers, Today's Litres, Today's Collections, Monthly metrics) are calculated dynamically via DB queries, ensuring real-time zero-mock reporting.
