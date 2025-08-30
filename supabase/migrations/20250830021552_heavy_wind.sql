/*
  # Fix users table RLS policies for login

  1. Security Updates
    - Update RLS policies to allow reading users by email for login
    - Ensure login functionality works properly
    - Maintain security while allowing authentication

  2. Changes
    - Add policy for reading users during login process
    - Update existing policies to be more specific
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Allow reading users for login (needed for getUserByEmail)
CREATE POLICY "Allow reading users for login"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Admins can manage all users
CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id::text = auth.uid()::text
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id::text = auth.uid()::text
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id::text = auth.uid()::text
      AND admin_user.role = 'admin'
    )
  );