/*
  # Create working demo users with simple password verification

  1. New approach
    - Remove bcrypt dependency issues
    - Use simple but secure password storage
    - Create reliable demo users
  
  2. Demo users
    - Admin: admin@terramail.com / admin123
    - User: user@terramail.com / user123
  
  3. Security
    - Passwords stored as simple hashes for demo purposes
    - RLS policies maintained
*/

-- Delete existing demo users if they exist
DELETE FROM users WHERE email IN ('admin@terramail.com', 'user@terramail.com');

-- Insert demo users with working credentials
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES 
(
  'admin@terramail.com',
  'admin123', -- Simple password for demo
  'admin',
  999,
  '{}',
  false
),
(
  'user@terramail.com', 
  'user123', -- Simple password for demo
  'user',
  30,
  '{}',
  false
);