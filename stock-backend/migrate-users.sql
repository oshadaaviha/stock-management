-- Migration to add authentication fields to users table
-- Run this in your MySQL database

USE stockdb;

-- Drop existing users table if it doesn't have the new structure
-- (This will delete existing users - use with caution in production!)
DROP TABLE IF EXISTS users;

-- Create users table with authentication fields
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Finance', 'Reporter') NOT NULL DEFAULT 'Reporter',
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
);
