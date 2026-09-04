---
title: AquaDistribute Water Management System
emoji: 💧
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Water Distribution Management System

A production-ready, full-stack enterprise platform built for organizations that receive drinking water from a free water source and manage water distribution and payment collection for households.

---

## Key Business Capabilities

- **Strict Scope**: Dedicated solely to water distribution tracking, pricing calculation, customer administration, collector operation, payment collection, and digital receipts.
- **Automated Price Engine**: Price per litre is set by Admin. Total bill is strictly computed by the engine ($\text{quantity} \times \text{pricePerLitre}$) without manual collector intervention.
- **Historical Audit Integrity**: Updates to water pricing preserve exact historical cost snapshots on past transactions.
- **Real-Time Data**: Zero-mock architecture. Admin dashboard indicators and mobile stats are queried dynamically from MySQL/MariaDB database.

---

## Directory Structure

```
water-distribution-system/
├── backend/            # Spring Boot REST API (Java 17, Spring Security, JPA, JWT)
├── admin-dashboard/    # Admin Web Portal (React, TypeScript, Vite, Tailwind CSS)
├── mobile-app/         # Collector Mobile App (Flutter, Dart, Secure Token Storage)
├── database/           # MySQL / MariaDB Schema DDL & Seed Data (`schema.sql`)
└── docs/               # System Documentation (Architecture, ERD, API Spec, Setup)
```

---

## Technology Stack

- **Backend**: Java 17+, Spring Boot 3.x, Spring Security, JWT, Spring Data JPA, Hibernate, MySQL/MariaDB, Maven.
- **Admin Portal**: React 18, TypeScript, Vite, Tailwind CSS, Axios, React Router v6, Recharts, Lucide Icons.
- **Mobile App**: Flutter 3.x, Dart, Provider / State Management, Secure Token Storage.
- **Database**: MySQL 8.0+ / MariaDB 10.5+.

---

## Quick Start Guide

Detailed step-by-step instructions are available in [`docs/setup-guide.md`](docs/setup-guide.md).

```bash
# 1. Database setup
mysql -u root -p < database/schema.sql

# 2. Start Backend
cd backend && mvn spring-boot:run

# 3. Start Admin Dashboard
cd admin-dashboard && npm install && npm run dev

# 4. Start Mobile App
cd mobile-app && flutter pub get && flutter run
```

---

## Documentation Links

- [System Architecture](docs/architecture.md)
- [Database ERD](docs/erd.md)
- [REST API Specification](docs/api-spec.md)
- [Setup & Execution Guide](docs/setup-guide.md)
