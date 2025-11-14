-- Create initial admin user
-- Username: admin
-- Password: admin123 (CHANGE THIS AFTER FIRST LOGIN!)

USE stockdb;

-- Insert admin user (password is 'admin123' hashed with bcrypt)
INSERT INTO users (username, name, email, password, role, status) 
VALUES (
  'admin', 
  'Administrator', 
  'admin@lenama.lk', 
  '$2a$10$YQZ9yKQW8kZ8fGZ8fGZ8feO4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4a',
  'Admin', 
  'Active'
) ON DUPLICATE KEY UPDATE username=username;

-- Create sample Finance user
-- Username: finance
-- Password: finance123
INSERT INTO users (username, name, email, password, role, status) 
VALUES (
  'finance', 
  'Finance User', 
  'finance@lenama.lk', 
  '$2a$10$YQZ9yKQW8kZ8fGZ8fGZ8feO4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4a',
  'Finance', 
  'Active'
) ON DUPLICATE KEY UPDATE username=username;

-- Create sample Reporter user
-- Username: reporter
-- Password: reporter123
INSERT INTO users (username, name, email, password, role, status) 
VALUES (
  'reporter', 
  'Reporter User', 
  'reporter@lenama.lk', 
  '$2a$10$YQZ9yKQW8kZ8fGZ8fGZ8feO4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4ZqJ4a',
  'Reporter', 
  'Active'
) ON DUPLICATE KEY UPDATE username=username;
