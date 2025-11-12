-- Migration to add new fields to sales table for invoice header
-- Run this if you have an existing database

USE stockdb;

-- Add new columns to sales table if they don't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) NULL AFTER payment_type,
ADD COLUMN IF NOT EXISTS route_rep_code VARCHAR(100) NULL AFTER batch_no,
ADD COLUMN IF NOT EXISTS sales_rep_name VARCHAR(255) NULL AFTER route_rep_code;

SELECT 'Migration completed successfully!' AS status;
