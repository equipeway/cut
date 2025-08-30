/*
  # Criar usuários demo

  1. Novos Usuários
    - Admin demo: admin@terramail.com / admin123
    - Usuário demo: user@terramail.com / user123
  
  2. Configurações
    - Senhas hasheadas com bcrypt
    - Admin com 999 dias de assinatura
    - Usuário com 30 dias de assinatura
    - Nenhum IP restrito
*/

-- Inserir usuário admin demo
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'admin@terramail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: admin123
  'admin',
  999,
  '{}',
  false
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  subscription_days = EXCLUDED.subscription_days;

-- Inserir usuário demo
INSERT INTO users (
  email, 
  password_hash, 
  role, 
  subscription_days, 
  allowed_ips, 
  is_banned
) VALUES (
  'user@terramail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: user123
  'user',
  30,
  '{}',
  false
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  subscription_days = EXCLUDED.subscription_days;