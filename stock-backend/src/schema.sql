CREATE DATABASE IF NOT EXISTS stockdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockdb;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    strength VARCHAR(100),
    category VARCHAR(100),
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 0,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  customer_address VARCHAR(255) NULL,
  customer_vat VARCHAR(100) NULL,
  route VARCHAR(120) NULL,
  sales_rep_id BIGINT UNSIGNED NULL,
  is_system BOOLEAN DEFAULT TRUE COMMENT 'TRUE if manually added, FALSE if auto-created from sales',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_name (name),
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_sales_rep (sales_rep_id),
  INDEX idx_customers_is_system (is_system)
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  batch_number VARCHAR(50) NOT NULL,
  mfg_date DATE NOT NULL,
  exp_date DATE NOT NULL,
  pack_size VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sku) REFERENCES products(sku)
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  invoice_no VARCHAR(40) NOT NULL,
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_id BIGINT UNSIGNED NULL,
  sales_rep_id BIGINT UNSIGNED NULL,
  payment_type VARCHAR(100) NULL,
  batch_no VARCHAR(100) NULL,
  route_rep_code VARCHAR(100) NULL,
  sales_rep_name VARCHAR(255) NULL,
  customer_address VARCHAR(255) NULL,
  customer_vat VARCHAR(100) NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pack_size VARCHAR(50) NOT NULL,
  qty INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  sub_total DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sales_rep_id) REFERENCES sale_rep(id),
  KEY idx_invoice_no (invoice_no),
  KEY idx_sales_customer (customer_id),
  KEY idx_sales_rep (sales_rep_id),
  KEY idx_sales_sku (sku)
);

CREATE TABLE IF NOT EXISTS sale_rep (
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
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ref_no VARCHAR(40) NOT NULL UNIQUE,
  supplier_id BIGINT UNSIGNED NULL,
  batch_number VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mfg_date DATE NOT NULL,
  exp_date DATE NOT NULL,
  pack_size VARCHAR(50) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  cost DECIMAL(12, 2) NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  sub_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_purchases_sku (sku),
  INDEX idx_purchases_supplier (supplier_id)
);

-- CREATE TABLE IF NOT EXISTS purchase_items (
--   id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
--   purchase_id BIGINT UNSIGNED NOT NULL,
--   sku VARCHAR(50) NOT NULL,
--   qty INT NOT NULL,
--   cost DECIMAL(12,2) NOT NULL,
--   line_total DECIMAL(12,2) NOT NULL,
--   FOREIGN KEY (purchase_id) REFERENCES purchases(id),
--   FOREIGN KEY (sku) REFERENCES products(sku)
-- );

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  contact VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);