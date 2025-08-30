/*
  # Create admin user

  1. New Data
    - Insert admin user with credentials
    - Email: admin@terramail.com
    - Password: admin123 (hashed)
    - Role: admin
    - Full subscription access

  2. Security
    - Uses existing RLS policies
    - Admin role provides elevated access
*/

-- Insert admin user with hashed password for 'admin123'
INSERT INTO users (
  email,
  password_hash,
  role,
  subscription_days,
  allowed_ips,
  is_banned
) VALUES (
  'admin@terramail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'admin123'
  'admin',
  999999,
  '{}',
  false
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  subscription_days = EXCLUDED.subscription_days,
  is_banned = EXCLUDED.is_banned;