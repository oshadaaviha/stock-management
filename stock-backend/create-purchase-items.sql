-- Create purchase_items table to store individual line items for each purchase
CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  mfg_date DATE NOT NULL,
  exp_date DATE NOT NULL,
  pack_size VARCHAR(50) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  qty INT NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Show the table structure
DESCRIBE purchase_items;
