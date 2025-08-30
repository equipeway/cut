/*
  # Fix admin user creation RLS policy

  1. Security Changes
    - Add policy for admins to create users
    - Ensure admins can INSERT new users into the users table
    - Maintain existing security for non-admin users

  2. Changes Made
    - Create "Admins can create users" policy for INSERT operations
    - Policy checks if the current user has admin role before allowing INSERT
*/

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- Create policy that allows admins to insert new users
CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id::text = auth.uid()::text
      AND admin_user.role = 'admin'::user_role
    )
  );