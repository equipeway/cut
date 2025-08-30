/*
  # Garantir que usuários admin existam

  1. Operações
    - Remove usuários existentes se houver
    - Cria usuário admin com senha simples
    - Cria usuário comum para teste
  
  2. Credenciais
    - Admin: admin@terramail.com / admin123
    - User: user@terramail.com / user123
*/

-- Remove usuários existentes para evitar conflitos
DELETE FROM users WHERE email IN ('admin@terramail.com', 'user@terramail.com');

-- Cria usuário admin
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'admin@terramail.com',
  'admin123',
  'admin',
  365,
  '{}',
  false
);

-- Cria usuário comum
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'user@terramail.com',
  'user123',
  'user',
  30,
  '{}',
  false
);