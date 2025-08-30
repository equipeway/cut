/*
  # Fix user creation RLS policy

  1. Security Changes
    - Add policy to allow admins to create new users
    - Ensure only authenticated admin users can insert new users
    - Maintain security while allowing admin functionality

  2. Changes Made
    - Create new INSERT policy for users table
    - Allow authenticated users with admin role to create users
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- Create policy to allow admins to create new users
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