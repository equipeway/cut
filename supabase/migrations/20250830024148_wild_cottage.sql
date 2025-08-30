/*
  # Fix user creation RLS policy

  1. Security Changes
    - Drop existing restrictive insert policy
    - Create new policy allowing authenticated users to insert users
    - Maintain other security policies unchanged

  2. Changes Made
    - Remove "Allow user creation for authenticated users" policy
    - Add "Allow authenticated users to create users" policy with proper permissions
*/

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Allow user creation for authenticated users" ON users;

-- Create a new policy that allows authenticated users to insert new users
CREATE POLICY "Allow authenticated users to create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);