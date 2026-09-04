-- Water Distribution Management System - Database DDL & Seed Script
-- Compatible with MySQL 8.0+ / MariaDB 10.5+

CREATE DATABASE IF NOT EXISTS water_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE water_db;

-- -----------------------------------------------------
-- Table: roles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: users
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: user_roles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: villages
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS villages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: water_prices
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS water_prices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    price_per_litre DECIMAL(10, 2) NOT NULL,
    effective_from DATETIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(255),
    created_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_water_price_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: water_price_tiers
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS water_price_tiers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    water_price_id BIGINT NOT NULL,
    tier_name VARCHAR(100) NOT NULL,
    min_litres DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_litres DECIMAL(10, 2),
    price_per_litre DECIMAL(10, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_price_tier_water_price FOREIGN KEY (water_price_id) REFERENCES water_prices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customers
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    village_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_meter_reading DECIMAL(10, 2) DEFAULT 120.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_village FOREIGN KEY (village_id) REFERENCES villages(id),
    INDEX idx_customer_code (customer_code),
    INDEX idx_customer_phone (phone_number),
    INDEX idx_customer_name (full_name),
    INDEX idx_customer_village (village_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: water_distributions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS water_distributions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    distribution_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    collector_id BIGINT NOT NULL,
    quantity_litres DECIMAL(10, 2) NOT NULL,
    price_per_litre DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    distribution_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dist_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_dist_collector FOREIGN KEY (collector_id) REFERENCES users(id),
    INDEX idx_dist_date (distribution_date),
    INDEX idx_dist_payment_status (payment_status),
    INDEX idx_dist_customer (customer_id),
    INDEX idx_dist_collector (collector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: payments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    distribution_id BIGINT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- CASH, ONLINE
    payment_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, FAILED
    collector_id BIGINT NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_distribution FOREIGN KEY (distribution_id) REFERENCES water_distributions(id),
    CONSTRAINT fk_payment_collector FOREIGN KEY (collector_id) REFERENCES users(id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_method (payment_method),
    INDEX idx_payment_collector (collector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: receipts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id BIGINT NOT NULL UNIQUE,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receipt_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
    INDEX idx_receipt_number (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Seed Initial Data
-- -----------------------------------------------------

-- Roles
INSERT INTO roles (id, name) VALUES (1, 'ROLE_ADMIN') ON DUPLICATE KEY UPDATE name=name;
INSERT INTO roles (id, name) VALUES (2, 'ROLE_COLLECTOR') ON DUPLICATE KEY UPDATE name=name;

-- Default Admin User (Password: admin123 -> BCrypt hash)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active)
VALUES (1, 'admin', 'admin@waterdist.org', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'System Administrator', '+94770000000', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Default Collector User (Password: collector123 -> BCrypt hash)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active)
VALUES (2, 'collector1', 'collector1@waterdist.org', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'John Collector', '+94771112233', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Assign Roles
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1) ON DUPLICATE KEY UPDATE role_id=role_id;
INSERT INTO user_roles (user_id, role_id) VALUES (2, 2) ON DUPLICATE KEY UPDATE role_id=role_id;

-- Default Villages / Sectors
INSERT INTO villages (id, name, code, description, is_active)
VALUES 
(1, 'Green Valley Central', 'VIL-GVC', 'Main distribution sector in central district', TRUE),
(2, 'Riverside Sector East', 'VIL-RSE', 'Eastern residential and commercial sector', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Default Active Water Price (Rs 5.00 base)
INSERT INTO water_prices (id, price_per_litre, effective_from, is_active, notes, created_by)
VALUES (1, 5.00, NOW(), TRUE, 'Standard 3-Tier tariff rate', 1)
ON DUPLICATE KEY UPDATE price_per_litre=price_per_litre;

-- Default 3-Tier Tariff Slabs
INSERT INTO water_price_tiers (id, water_price_id, tier_name, min_litres, max_litres, price_per_litre)
VALUES 
(1, 1, 'Tier 1 - Essential (0-20L)', 0.00, 20.00, 4.00),
(2, 1, 'Tier 2 - Standard (21-50L)', 21.00, 50.00, 5.00),
(3, 1, 'Tier 3 - High Use (51+L)', 51.00, NULL, 6.50)
ON DUPLICATE KEY UPDATE tier_name=tier_name;

-- Sample Registered Customers
INSERT INTO customers (id, customer_code, full_name, phone_number, address, village_id, status, last_meter_reading)
VALUES 
(1, 'CUST-GVC-0001', 'Robert Smith', '+94771234567', '45 Water Tank Road, Sector 3', 1, 'ACTIVE', 180.00),
(2, 'CUST-GVC-0002', 'Sarah Jenkins', '+94772345678', '12 Palm Grove, Main Street', 1, 'ACTIVE', 125.00),
(3, 'CUST-GVC-0003', 'Michael Brown', '+94773456789', '88 Lakeview Avenue', 1, 'ACTIVE', 270.00),
(4, 'CUST-GVC-0004', 'David Wilson', '+94774567890', '19 Hillside Crescent', 1, 'ACTIVE', 95.00),
(5, 'CUST-RSE-0005', 'Emma Watson', '+94775678901', '74 River Road, Block B', 2, 'ACTIVE', 160.00),
(6, 'CUST-RSE-0006', 'James Anderson', '+94776789012', '102 Sunrise Boulevard', 2, 'ACTIVE', 320.00)
ON DUPLICATE KEY UPDATE customer_code=customer_code;

-- Sample Water Distributions (PAID and UNPAID / CREDIT)
INSERT INTO water_distributions (id, distribution_code, customer_id, collector_id, quantity_litres, price_per_litre, total_amount, distribution_date, payment_status)
VALUES 
-- 1. PAID by Cash (Robert Smith - 60L @ Rs. 6.50 = Rs. 390.00)
(1, 'DIST-2026-0001', 1, 2, 60.00, 6.50, 390.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'PAID'),

-- 2. PAID Online / UPI (Sarah Jenkins - 40L @ Rs. 5.00 = Rs. 200.00)
(2, 'DIST-2026-0002', 2, 2, 40.00, 5.00, 200.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'PAID'),

-- 3. UNPAID / Credit Bill (Michael Brown - 60L @ Rs. 6.50 = Rs. 390.00) -> PENDING
(3, 'DIST-2026-0003', 3, 2, 60.00, 6.50, 390.00, NOW(), 'PENDING'),

-- 4. PAID by Cash (David Wilson - 15L @ Rs. 4.00 = Rs. 60.00)
(4, 'DIST-2026-0004', 4, 2, 15.00, 4.00, 60.00, NOW(), 'PAID'),

-- 5. UNPAID / Credit Bill (Emma Watson - 48L @ Rs. 5.00 = Rs. 240.00) -> PENDING
(5, 'DIST-2026-0005', 5, 2, 48.00, 5.00, 240.00, NOW(), 'PENDING'),

-- 6. UNPAID / Credit Bill (James Anderson - 80L @ Rs. 6.50 = Rs. 520.00) -> PENDING
(6, 'DIST-2026-0006', 6, 2, 80.00, 6.50, 520.00, NOW(), 'PENDING')
ON DUPLICATE KEY UPDATE distribution_code=distribution_code;

-- Sample Payment Records (For the PAID distributions)
INSERT INTO payments (id, distribution_id, amount, payment_method, payment_status, collector_id, payment_date, reference_number)
VALUES 
(1, 1, 390.00, 'CASH', 'COMPLETED', 2, DATE_SUB(NOW(), INTERVAL 2 DAY), 'CASH-REC-001'),
(2, 2, 200.00, 'ONLINE', 'COMPLETED', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), 'UPI-TXN-984210'),
(3, 4, 60.00, 'CASH', 'COMPLETED', 2, NOW(), 'CASH-REC-004')
ON DUPLICATE KEY UPDATE distribution_id=distribution_id;

-- Sample Official Receipts (For the Completed Payments)
INSERT INTO receipts (id, receipt_number, payment_id, issued_at)
VALUES 
(1, 'WTR-2026-100101', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'WTR-2026-100102', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 'WTR-2026-100104', 3, NOW())
ON DUPLICATE KEY UPDATE receipt_number=receipt_number;
