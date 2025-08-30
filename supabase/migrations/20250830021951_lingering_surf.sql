/*
  # Fix admin user creation RLS policy

  1. Security Changes
    - Drop existing conflicting INSERT policy for users table
    - Create new policy allowing authenticated admins to insert users
    - Ensure proper permission checking for admin role

  2. Policy Details
    - Target: INSERT operations on users table
    - Role: authenticated users only
    - Check: User must have admin role to create new users
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- Create new INSERT policy for admins
CREATE POLICY "Authenticated admins can create users"
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