-- Add missing columns to purchase_items table
ALTER TABLE purchase_items 
  ADD COLUMN mfg_date DATE NULL AFTER product_id,
  ADD COLUMN exp_date DATE NULL AFTER mfg_date,
  ADD COLUMN pack_size VARCHAR(50) NULL AFTER exp_date,
  ADD COLUMN price DECIMAL(12,2) NULL AFTER pack_size,
  ADD COLUMN cost DECIMAL(12,2) NULL AFTER price;

-- Verify the changes
DESCRIBE purchase_items;
