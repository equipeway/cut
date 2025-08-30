/*
  # TerrraMail Database Schema

  1. New Tables
    - `users` - User accounts with authentication and subscription info
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `role` (enum: user/admin)
      - `subscription_days` (integer)
      - `allowed_ips` (text array)
      - `is_banned` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `login_attempts` - Track login attempts for security
      - `id` (uuid, primary key)
      - `ip_address` (text)
      - `user_email` (text, nullable)
      - `success` (boolean)
      - `created_at` (timestamp)
    
    - `banned_ips` - IP ban management
      - `id` (uuid, primary key)
      - `ip_address` (text, unique)
      - `reason` (text)
      - `banned_until` (timestamp, nullable)
      - `created_at` (timestamp)
    
    - `processing_sessions` - User processing sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `approved_count` (integer)
      - `rejected_count` (integer)
      - `loaded_count` (integer)
      - `tested_count` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subscription_plans` - Available subscription plans
      - `id` (uuid, primary key)
      - `name` (text)
      - `days` (integer)
      - `price` (numeric)
      - `description` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `user_purchases` - Purchase history
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `plan_id` (uuid, foreign key)
      - `days_added` (integer)
      - `amount_paid` (numeric)
      - `payment_method` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Admin-only access for management tables

  3. Initial Data
    - Create default admin user
    - Add sample subscription plans
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role DEFAULT 'user',
  subscription_days integer DEFAULT 0,
  allowed_ips text[] DEFAULT '{}',
  is_banned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Login attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_email text,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Banned IPs table
CREATE TABLE IF NOT EXISTS banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  reason text DEFAULT 'Violation of terms',
  banned_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Processing sessions table
CREATE TABLE IF NOT EXISTS processing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  approved_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  loaded_count integer DEFAULT 0,
  tested_count integer DEFAULT 0,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days integer NOT NULL,
  price numeric(10,2) NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
  days_added integer NOT NULL,
  amount_paid numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "Admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for login_attempts table
CREATE POLICY "Admins can view login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "System can insert login attempts"
  ON login_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for banned_ips table
CREATE POLICY "Admins can manage banned IPs"
  ON banned_ips
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for processing_sessions table
CREATE POLICY "Users can manage own sessions"
  ON processing_sessions
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for subscription_plans table
CREATE POLICY "Everyone can read active plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for user_purchases table
CREATE POLICY "Users can view own purchases"
  ON user_purchases
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "Admins can manage purchases"
  ON user_purchases
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, days, price, description) VALUES
  ('Plano Básico', 30, 29.90, 'Acesso por 30 dias com suporte básico'),
  ('Plano Premium', 90, 79.90, 'Acesso por 90 dias com suporte prioritário'),
  ('Plano Anual', 365, 299.90, 'Acesso por 1 ano com todos os benefícios')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_sessions_updated_at BEFORE UPDATE ON processing_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();