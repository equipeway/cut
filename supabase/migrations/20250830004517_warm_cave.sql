/*
  # Fix login attempts RLS policies

  1. Security Changes
    - Update RLS policy for login_attempts table to allow anonymous inserts
    - This is necessary because login attempts (especially failed ones) occur before authentication
    - Allows both authenticated and anonymous users to insert login attempts
    - Maintains read restrictions for admins only

  2. Policy Updates
    - Modified "System can insert login attempts" policy to include anon role
    - Ensures login tracking works for all authentication scenarios
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "System can insert login attempts" ON login_attempts;

-- Create new policy that allows both authenticated and anonymous users to insert
CREATE POLICY "Allow login attempt logging"
  ON login_attempts
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Keep the existing read policy for admins
-- (This should already exist, but adding it for completeness)
DROP POLICY IF EXISTS "Admins can view login attempts" ON login_attempts;

CREATE POLICY "Admins can view login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );