/*
  # Fix admin user creation policy

  1. Security Changes
    - Drop existing conflicting INSERT policies
    - Create simple policy allowing authenticated admins to insert users
    - Ensure proper permission validation

  This migration fixes the RLS violation error when admins try to create users.
*/

-- Drop any existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Authenticated admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Allow admin user creation" ON users;

-- Create a simple, direct policy for admin user creation
CREATE POLICY "Enable admin user creation"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id::text = auth.uid()::text
      AND admin_check.role = 'admin'
    )
  );