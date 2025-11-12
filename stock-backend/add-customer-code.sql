-- Add customer_code column to customers table
USE stockdb;

-- Add the column
ALTER TABLE customers 
ADD COLUMN customer_code VARCHAR(50) NULL UNIQUE AFTER id;

-- Add index for faster lookups
CREATE INDEX idx_customers_customer_code ON customers(customer_code);

-- Optional: Generate customer codes for existing customers (e.g., CUST-0001, CUST-0002, etc.)
-- Uncomment the following lines if you want to auto-generate codes:

-- SET @counter = 0;
-- UPDATE customers 
-- SET customer_code = CONCAT('CUST-', LPAD((@counter := @counter + 1), 4, '0'))
-- WHERE customer_code IS NULL
-- ORDER BY id;
