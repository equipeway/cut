/*
  # Ajustar políticas RLS para criação de usuários

  1. Políticas Atualizadas
    - Permitir criação de usuários por qualquer usuário autenticado
    - Manter proteção para operações sensíveis
    - Simplificar política de inserção

  2. Segurança
    - RLS continua habilitado
    - Políticas de leitura e atualização mantidas
    - Apenas política de inserção foi flexibilizada
*/

-- Remove política restritiva atual
DROP POLICY IF EXISTS "Enable admin user creation" ON users;

-- Cria nova política mais flexível para criação de usuários
CREATE POLICY "Allow user creation for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Mantém política para permitir que usuários leiam seus próprios dados
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- Política para atualizações (apenas admins ou próprio usuário)
DROP POLICY IF EXISTS "Users can update own data or admins can update any" ON users;
CREATE POLICY "Users can update own data or admins can update any"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ))
  WITH CHECK (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- Política para deleção (apenas admins)
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id::text = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));