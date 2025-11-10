-- Add new medicine-specific fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255) AFTER name,
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255) AFTER generic_name,
ADD COLUMN IF NOT EXISTS strength VARCHAR(100) AFTER brand_name;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_products_generic_name ON products(generic_name);
CREATE INDEX IF NOT EXISTS idx_products_brand_name ON products(brand_name);
CREATE INDEX IF NOT EXISTS idx_products_strength ON products(strength);

-- Update the existing records to have empty values for new fields
UPDATE products 
SET 
    generic_name = COALESCE(generic_name, ''),
    brand_name = COALESCE(brand_name, ''),
    strength = COALESCE(strength, '')
WHERE 
    generic_name IS NULL 
    OR brand_name IS NULL 
    OR strength IS NULL;