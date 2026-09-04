-- Flyway Migration Script V2: Initial Seed Data

-- System Roles
INSERT INTO roles (id, name) VALUES (1, 'ROLE_ADMIN') ON DUPLICATE KEY UPDATE name=name;
INSERT INTO roles (id, name) VALUES (2, 'ROLE_COLLECTOR') ON DUPLICATE KEY UPDATE name=name;

-- Default System Admin User (Password: admin123 -> BCrypt hash)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active)
VALUES (1, 'admin', 'admin@waterdist.org', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'System Administrator', '+94770000000', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Default Collector Staff User (Password: collector123 -> BCrypt hash)
INSERT INTO users (id, username, email, password, full_name, phone_number, is_active)
VALUES (2, 'collector1', 'collector1@waterdist.org', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6', 'John Collector', '+94771112233', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Assign Roles
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1) ON DUPLICATE KEY UPDATE role_id=role_id;
INSERT INTO user_roles (user_id, role_id) VALUES (2, 2) ON DUPLICATE KEY UPDATE role_id=role_id;

-- Default Village Sector
INSERT INTO villages (id, name, code, description, is_active)
VALUES (1, 'Green Valley Central', 'VIL-GVC', 'Main distribution sector in central district', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Initial Active Water Price Rate & Tiers (Rs 5.00 Base Rate)
INSERT INTO water_prices (id, price_per_litre, effective_from, is_active, notes, created_by)
VALUES (1, 5.00, NOW(), TRUE, 'Initial standard water rate and slabs', 1)
ON DUPLICATE KEY UPDATE price_per_litre=price_per_litre;

INSERT INTO water_price_tiers (id, water_price_id, tier_name, min_litres, max_litres, price_per_litre)
VALUES 
(1, 1, 'Tier 1 - Essential (0-20L)', 0.00, 20.00, 4.00),
(2, 1, 'Tier 2 - Standard (21-50L)', 21.00, 50.00, 5.00),
(3, 1, 'Tier 3 - High Use (51+L)', 51.00, NULL, 6.50)
ON DUPLICATE KEY UPDATE tier_name=tier_name;
