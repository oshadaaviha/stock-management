-- Migration script to update existing stockdb tables
-- Run this to update your existing database to match the new schema

USE stockdb;

-- ==========================================
-- 1) FIX SALE_REP TABLE
-- Remove wrong FK to sales, rename sale_rep_id to sale_rep_code, add status
-- ==========================================
SET FOREIGN_KEY_CHECKS = 0;

-- Create new sale_rep structure
CREATE TABLE IF NOT EXISTS sale_rep_new (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sale_rep_code VARCHAR(50) NOT NULL UNIQUE,
  sale_rep_name VARCHAR(180) NOT NULL,
  sale_rep_email VARCHAR(160) NULL,
  sale_rep_phone VARCHAR(40) NULL,
  sale_rep_route VARCHAR(255) NULL,
  status ENUM('Active','Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sale_rep_code (sale_rep_code),
  INDEX idx_sale_rep_name (sale_rep_name)
) ENGINE=InnoDB;

-- Migrate existing data (convert sale_rep_id to sale_rep_code as string)
INSERT INTO sale_rep_new (id, sale_rep_code, sale_rep_name, sale_rep_email, sale_rep_phone, sale_rep_route, status, created_at)
SELECT id, CONCAT('REP-', LPAD(sale_rep_id, 4, '0')), sale_rep_name, sale_rep_email, sale_rep_phone, sale_rep_route, 'Active', created_at
FROM sale_rep;

-- Replace old table
DROP TABLE sale_rep;
RENAME TABLE sale_rep_new TO sale_rep;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 2) UPDATE CUSTOMERS TABLE
-- Add route, sales_rep_id, is_system columns, add indexes and FK
-- ==========================================

-- Add columns if they don't exist (run these one by one if you get errors)
ALTER TABLE customers
  ADD COLUMN route VARCHAR(120) NULL AFTER customer_vat;

ALTER TABLE customers
  ADD COLUMN sales_rep_id BIGINT UNSIGNED NULL AFTER route;

ALTER TABLE customers
  ADD COLUMN is_system BOOLEAN DEFAULT TRUE COMMENT 'TRUE if manually added, FALSE if auto-created from sales' AFTER sales_rep_id;

-- Set existing customers as system customers (manually added)
UPDATE customers SET is_system = TRUE WHERE is_system IS NULL;

-- Add indexes
ALTER TABLE customers
  ADD INDEX idx_customers_name (name),
  ADD INDEX idx_customers_phone (phone),
  ADD INDEX idx_customers_sales_rep (sales_rep_id),
  ADD INDEX idx_customers_is_system (is_system);

-- Add foreign key to sale_rep
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_sales_rep
    FOREIGN KEY (sales_rep_id) REFERENCES sale_rep(id);

-- ==========================================
-- 3) UPDATE SALES TABLE
-- Add FK to sale_rep and additional indexes
-- ==========================================

ALTER TABLE sales
  ADD INDEX idx_sales_rep (sales_rep_id),
  ADD INDEX idx_sales_customer (customer_id),
  ADD INDEX idx_sales_sku (sku);

ALTER TABLE sales
  ADD CONSTRAINT fk_sales_sales_rep
    FOREIGN KEY (sales_rep_id) REFERENCES sale_rep(id);

-- ==========================================
-- 4) UPDATE PURCHASES TABLE
-- Rename quantity -> qty, widen decimals, add discount/tax/sub_total
-- ==========================================

-- Rename quantity to qty
ALTER TABLE purchases
  CHANGE COLUMN quantity qty INT NOT NULL DEFAULT 0;

-- Widen decimal columns
ALTER TABLE purchases
  MODIFY COLUMN price DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN cost DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN total DECIMAL(12,2) NOT NULL;

-- Add new columns
ALTER TABLE purchases
  ADD COLUMN discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER qty,
  ADD COLUMN tax DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount,
  ADD COLUMN sub_total DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER tax;

-- Add indexes
ALTER TABLE purchases
  ADD INDEX idx_purchases_sku (sku),
  ADD INDEX idx_purchases_supplier (supplier_id);

-- ==========================================
-- VERIFICATION
-- ==========================================
DESCRIBE customers;
DESCRIBE sale_rep;
DESCRIBE sales;
DESCRIBE purchases;

SHOW CREATE TABLE customers;
SHOW CREATE TABLE sale_rep;
SHOW CREATE TABLE sales;
SHOW CREATE TABLE purchases;
