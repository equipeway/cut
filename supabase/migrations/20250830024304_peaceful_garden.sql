/*
  # Allow anonymous user creation

  1. Security Changes
    - Drop existing restrictive INSERT policy on users table
    - Create new INSERT policy that allows both anon and authenticated roles
    - This enables user creation through the admin panel using the anon key

  2. Notes
    - This is necessary because the Supabase client is configured with anon key
    - The application handles its own authentication logic
    - Only affects INSERT operations, other policies remain secure
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to create users" ON users;

-- Create new policy that allows anon role to insert users
CREATE POLICY "Allow user creation via anon role"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);