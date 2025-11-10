-- Add new columns to products table
ALTER TABLE products
ADD COLUMN generic_name VARCHAR(255) AFTER name,
ADD COLUMN brand_name VARCHAR(255) AFTER generic_name,
ADD COLUMN strength VARCHAR(100) AFTER brand_name;

-- Update existing records to have empty values
UPDATE products
SET generic_name = NULL,
    brand_name = NULL,
    strength = NULL
WHERE generic_name IS NULL;

-- Optional: Add indexes for better search performance
CREATE INDEX idx_products_generic_name ON products(generic_name);
CREATE INDEX idx_products_brand_name ON products(brand_name);

-- In case you need to rollback:
-- ALTER TABLE products
-- DROP COLUMN generic_name,
-- DROP COLUMN brand_name,
-- DROP COLUMN strength;
-- DROP INDEX idx_products_generic_name ON products;
-- DROP INDEX idx_products_brand_name ON products;