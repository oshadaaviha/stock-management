# Add customer_address column to sales table if not exists
C:\xampp\mysql\bin\mysql.exe -u root -e @"
USE stockdb;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address VARCHAR(255) NULL AFTER sales_rep_name;
DESCRIBE sales;
"@
