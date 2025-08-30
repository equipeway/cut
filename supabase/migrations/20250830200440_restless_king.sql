/*
  # Create login_attempts table

  1. New Tables
    - `login_attempts`
      - `id` (uuid, primary key)
      - `ip_address` (text, not null)
      - `user_email` (text, nullable)
      - `success` (boolean, not null)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `login_attempts` table
    - Add policy for admins to view login attempts
    - Add policy to allow logging attempts (anon and authenticated)

  3. Indexes
    - Index on ip_address for performance
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_email text,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts (created_at);

-- RLS Policies
CREATE POLICY "Admins can view login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow login attempt logging"
  ON login_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);