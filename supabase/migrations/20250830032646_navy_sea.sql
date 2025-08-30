/*
  # Fix subscription_plans RLS policies

  1. Security Updates
    - Drop existing restrictive policies on subscription_plans table
    - Add new policies that allow admins to create, update, and delete plans
    - Allow all authenticated users to read active plans
    - Ensure proper admin role checking

  2. Changes Made
    - DROP existing policies that were too restrictive
    - CREATE new INSERT policy for admin users
    - CREATE new UPDATE policy for admin users  
    - CREATE new DELETE policy for admin users
    - UPDATE SELECT policy to allow reading active plans

  This fixes the RLS policy violation error when creating subscription plans.
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;
DROP POLICY IF EXISTS "Everyone can read active plans" ON subscription_plans;

-- Create proper policies for subscription_plans table

-- Allow admins to insert new plans
CREATE POLICY "Admins can create plans"
  ON subscription_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Allow admins to update plans
CREATE POLICY "Admins can update plans"
  ON subscription_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Allow admins to delete plans
CREATE POLICY "Admins can delete plans"
  ON subscription_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Allow everyone to read active plans, admins can read all plans
CREATE POLICY "Users can read active plans, admins can read all"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Also allow anonymous users to read active plans (for homepage)
CREATE POLICY "Anonymous can read active plans"
  ON subscription_plans
  FOR SELECT
  TO anon
  USING (is_active = true);