-- ====================================================================
-- AquaDistribute Water Management System
-- Supabase / PostgreSQL Production DDL Schema & Initial Seed Script
-- ====================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. VILLAGES TABLE
CREATE TABLE IF NOT EXISTS villages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. WATER PRICES TABLE
CREATE TABLE IF NOT EXISTS water_prices (
    id BIGSERIAL PRIMARY KEY,
    price_per_litre DECIMAL(10, 2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(255),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. WATER PRICE TIERS TABLE
CREATE TABLE IF NOT EXISTS water_price_tiers (
    id BIGSERIAL PRIMARY KEY,
    water_price_id BIGINT NOT NULL REFERENCES water_prices(id) ON DELETE CASCADE,
    tier_name VARCHAR(100) NOT NULL,
    min_litres DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_litres DECIMAL(10, 2),
    price_per_litre DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    village_id BIGINT NOT NULL REFERENCES villages(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_meter_reading DECIMAL(10, 2) DEFAULT 120.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customer_village ON customers(village_id);

-- 8. WATER DISTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS water_distributions (
    id BIGSERIAL PRIMARY KEY,
    distribution_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    collector_id BIGINT NOT NULL REFERENCES users(id),
    quantity_litres DECIMAL(10, 2) NOT NULL,
    price_per_litre DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    distribution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dist_date ON water_distributions(distribution_date);
CREATE INDEX IF NOT EXISTS idx_dist_payment_status ON water_distributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_dist_customer ON water_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_dist_collector ON water_distributions(collector_id);

-- 9. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    distribution_id BIGINT NOT NULL UNIQUE REFERENCES water_distributions(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    collector_id BIGINT NOT NULL REFERENCES users(id),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_collector ON payments(collector_id);

-- 10. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id BIGINT NOT NULL UNIQUE REFERENCES payments(id),
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipt_number ON receipts(receipt_number);

-- ====================================================================
-- SEED INITIAL SYSTEM DATA (Idempotent: Safe to execute multiple times)
-- ====================================================================

-- Insert System Roles
INSERT INTO roles (id, name) VALUES 
    (1, 'ROLE_ADMIN'),
    (2, 'ROLE_COLLECTOR')
ON CONFLICT (id) DO NOTHING;

-- Default System Administrator (Username: admin | Password: admin123)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active) VALUES 
    (1, 'admin', 'admin@waterdist.org', '.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'System Administrator', '+94770000000', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Default Collector Staff (Username: collector1 | Password: collector123)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active) VALUES 
    (2, 'collector1', 'collector1@waterdist.org', '.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'John Collector', '+94771112233', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Assign User Roles
INSERT INTO user_roles (user_id, role_id) VALUES 
    (1, 1),
    (2, 2)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert Default Village Sector
INSERT INTO villages (id, name, code, description, is_active) VALUES 
    (1, 'Green Valley Central', 'VIL-GVC', 'Main distribution sector in central district', TRUE),
    (2, 'Highland East Sector', 'VIL-HLE', 'Eastern hilly sector pipeline', TRUE),
    (3, 'Riverside North Zone', 'VIL-RSN', 'Northern community river distribution line', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Active Water Price (Base Rate: Rs 5.00)
INSERT INTO water_prices (id, price_per_litre, effective_from, is_active, notes, created_by) VALUES 
    (1, 5.00, CURRENT_TIMESTAMP, TRUE, 'Standard baseline municipal water rate', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert Tiered Pricing
INSERT INTO water_price_tiers (id, water_price_id, tier_name, min_litres, max_litres, price_per_litre) VALUES 
    (1, 1, 'Tier 1 - Essential (0-20L)', 0.00, 20.00, 4.00),
    (2, 1, 'Tier 2 - Standard (21-50L)', 21.00, 50.00, 5.00),
    (3, 1, 'Tier 3 - High Use (51+L)', 51.00, NULL, 6.50)
ON CONFLICT (id) DO NOTHING;

-- Reset Sequences to prevent ID conflicts
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('villages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM villages));
SELECT setval('water_prices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM water_prices));
SELECT setval('water_price_tiers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM water_price_tiers));
