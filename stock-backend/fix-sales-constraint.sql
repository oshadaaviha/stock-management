-- Restructure sales table to proper relational design
-- One invoice per order with separate items table

USE stockdb;

-- Drop old sales table
DROP TABLE IF EXISTS sales;

-- Create new sales header table
CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  invoice_no VARCHAR(40) NOT NULL UNIQUE,
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_id BIGINT UNSIGNED NULL,
  sales_rep_id BIGINT UNSIGNED NULL,
  payment_type VARCHAR(100) NULL,
  sub_total DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Create sales items table
CREATE TABLE IF NOT EXISTS sales_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pack_size VARCHAR(50) NOT NULL DEFAULT '',
  qty INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (sku) REFERENCES products(sku)
);
