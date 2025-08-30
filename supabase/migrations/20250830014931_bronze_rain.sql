/*
  # Fix user creation RLS policies

  1. Security Updates
    - Drop existing restrictive INSERT policy
    - Add new policy allowing admins to create users
    - Ensure proper authentication checks

  2. Changes
    - Remove "Admins can create users" policy if exists
    - Add new "Allow admin user creation" policy
    - Policy checks if current user is admin before allowing INSERT
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- Create new policy that allows admins to insert users
CREATE POLICY "Allow admin user creation"
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

-- Also ensure admins can read all users
DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id::text = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
  );

-- Allow admins to update users
DROP POLICY IF EXISTS "Admins can update users" ON users;
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

-- Allow admins to delete users
DROP POLICY IF EXISTS "Admins can delete users" ON users;
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