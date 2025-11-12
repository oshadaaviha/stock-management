-- Fix the purchases table structure to match the backend expectations
-- This will modify your existing purchases table

-- First, let's add the supplier column (text) since backend sends supplier name, not ID
ALTER TABLE purchases ADD COLUMN supplier VARCHAR(180) NULL AFTER supplier_id;

-- The purchases table has product-specific columns that should be in purchase_items instead
-- The backend expects purchases to only have header info
-- But we can't easily drop columns if there's data, so let's make them nullable for now
ALTER TABLE purchases MODIFY COLUMN sku VARCHAR(50) NULL;
ALTER TABLE purchases MODIFY COLUMN name VARCHAR(255) NULL;
ALTER TABLE purchases MODIFY COLUMN mfg_date DATE NULL;
ALTER TABLE purchases MODIFY COLUMN exp_date DATE NULL;
ALTER TABLE purchases MODIFY COLUMN pack_size VARCHAR(50) NULL;
ALTER TABLE purchases MODIFY COLUMN price DECIMAL(12, 2) NULL;
ALTER TABLE purchases MODIFY COLUMN cost DECIMAL(12, 2) NULL;
ALTER TABLE purchases MODIFY COLUMN qty INT NULL;

-- Verify the changes
DESCRIBE purchases;
