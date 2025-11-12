-- Migration: Add customer_address column to customers table
-- Run this SQL script in your MariaDB/MySQL database

USE stockdb;

-- Add customer_address column if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_address VARCHAR(255) NULL AFTER email;

-- Verify the change
DESCRIBE customers;
