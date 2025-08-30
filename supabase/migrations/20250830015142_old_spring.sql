/*
  # Corrigir políticas RLS para painel administrativo

  1. Políticas de Usuários
    - Permitir que admins criem, leiam, atualizem e deletem usuários
    - Permitir que usuários leiam seus próprios dados
  
  2. Políticas de Sessões
    - Permitir que usuários gerenciem suas próprias sessões
    - Permitir que admins vejam todas as sessões
  
  3. Políticas de Planos
    - Permitir que todos vejam planos ativos
    - Permitir que admins gerenciem planos
  
  4. Políticas de Compras
    - Permitir que usuários vejam suas próprias compras
    - Permitir que admins vejam e criem compras
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow admin user creation" ON users;

-- Users table policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- Processing sessions policies
DROP POLICY IF EXISTS "Users can manage own sessions" ON processing_sessions;

CREATE POLICY "Users can manage own sessions"
  ON processing_sessions
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ))
  WITH CHECK (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- Subscription plans policies
DROP POLICY IF EXISTS "Everyone can read active plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;

CREATE POLICY "Everyone can read active plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can manage plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- User purchases policies
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Admins can manage purchases" ON user_purchases;

CREATE POLICY "Users can view own purchases"
  ON user_purchases
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can manage purchases"
  ON user_purchases
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));