/*
  # Fix processing_sessions RLS policies

  1. Security Updates
    - Drop existing restrictive policies on processing_sessions table
    - Create new policies that allow users to manage their own sessions
    - Allow users to INSERT, SELECT, UPDATE their own processing sessions
    - Ensure user_id matches auth.uid() for all operations

  2. Policy Details
    - INSERT: Users can create sessions for themselves
    - SELECT: Users can read their own sessions
    - UPDATE: Users can update their own sessions
    - DELETE: Users can delete their own sessions (optional)
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can manage own sessions" ON processing_sessions;

-- Create new policies for processing_sessions
CREATE POLICY "Users can insert own sessions"
  ON processing_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can select own sessions"
  ON processing_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON processing_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON processing_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Also allow admins to manage all sessions
CREATE POLICY "Admins can manage all sessions"
  ON processing_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );