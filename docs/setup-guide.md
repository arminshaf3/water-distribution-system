# Setup & Execution Guide

Follow these steps to initialize and run the **Water Distribution Management System**.

## Prerequisites

- **Java JDK 17+**
- **Apache Maven 3.8+**
- **Node.js 18+** & **npm 9+**
- **Flutter SDK 3.x+**
- **MySQL 8.0+ / MariaDB 10.5+**

---

## 1. Database Setup

1. Log into MySQL / MariaDB server:
   ```bash
   mysql -u root -p
   ```
2. Execute the schema script:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

---

## 2. Backend Application (`/backend`)

1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Configure environment variables in `src/main/resources/application.yml` or set environment variables:
   ```bash
   export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/water_db?useSSL=false&serverTimezone=UTC
   export SPRING_DATASOURCE_USERNAME=root
   export SPRING_DATASOURCE_PASSWORD=yourpassword
   export JWT_SECRET=WaterDistributionSecureJwtSecretKey98765432101234567890
   ```
3. Build & test the project:
   ```bash
   mvn clean install
   ```
4. Run backend server:
   ```bash
   mvn spring-boot:run
   ```
   *Backend runs at `http://localhost:8080`*

---

## 3. Admin Web Dashboard (`/admin-dashboard`)

1. Navigate to admin dashboard directory:
   ```bash
   cd admin-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
   *Dashboard runs at `http://localhost:5173`*

---

## 4. Collector Mobile Application (`/mobile-app`)

1. Navigate to mobile app directory:
   ```bash
   cd mobile-app
   ```
2. Get Flutter dependencies:
   ```bash
   flutter pub get
   ```
3. Run on connected Android device or emulator:
   ```bash
   flutter run
   ```

---

## Default Credentials

| User | Username | Password | Role |
|---|---|---|---|
| Admin | `admin` | `admin123` | `ROLE_ADMIN` |
| Collector | `collector1` | `collector123` | `ROLE_COLLECTOR` |
