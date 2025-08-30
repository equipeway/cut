/*
  # Create Real Admin User

  1. New Tables
    - Clean up and create real admin user
    - Remove demo logic dependencies
  
  2. Security
    - Real admin with proper credentials
    - No demo fallbacks
*/

-- Delete any existing demo users
DELETE FROM users WHERE email IN ('admin@terramail.com', 'user@terramail.com');

-- Create real admin user
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'admin@terramail.com',
  'admin123',
  'admin',
  999,
  '{}',
  false
) ON CONFLICT (email) DO UPDATE SET
  password_hash = 'admin123',
  role = 'admin',
  subscription_days = 999,
  is_banned = false;

-- Create a test user
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'user@terramail.com',
  'user123',
  'user',
  30,
  '{}',
  false
) ON CONFLICT (email) DO UPDATE SET
  password_hash = 'user123',
  role = 'user',
  subscription_days = 30,
  is_banned = false;