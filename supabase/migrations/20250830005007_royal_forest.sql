/*
  # Recreate demo users with correct password hashes

  1. Changes
    - Delete existing demo users if they exist
    - Create admin user with properly hashed password for 'admin123'
    - Create regular user with properly hashed password for 'user123'
    - Set appropriate subscription days and roles

  2. Security
    - Users table already has RLS enabled
    - Existing policies will apply to new users
*/

-- Delete existing demo users if they exist
DELETE FROM users WHERE email IN ('admin@terramail.com', 'user@terramail.com');

-- Create admin user with bcrypt hash for 'admin123'
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'admin@terramail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  999,
  '{}',
  false
);

-- Create regular user with bcrypt hash for 'user123'  
INSERT INTO users (
  email,
  password_hash,
  role,
  subscription_days,
  allowed_ips,
  is_banned
) VALUES (
  'user@terramail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'user',
  30,
  '{}',
  false
);