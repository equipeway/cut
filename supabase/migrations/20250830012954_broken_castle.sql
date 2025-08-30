/*
  # Update subscription plans

  1. Changes
    - Clear existing plans and insert new standardized plans
    - Add Plano Básico (7 days, R$ 9.90)
    - Add Plano Standard (30 days, R$ 29.90)
    - Add Plano Premium (90 days, R$ 79.90)
    - Add Plano Ultimate (365 days, R$ 299.90)

  2. Security
    - Maintain existing RLS policies
    - Ensure all plans are active by default
*/

-- Clear existing plans (safe operation)
UPDATE subscription_plans SET is_active = false WHERE is_active = true;

-- Insert new standardized plans
INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at) VALUES
  (gen_random_uuid(), 'Plano Básico', 7, 9.90, 'Ideal para testes e uso básico', true, now()),
  (gen_random_uuid(), 'Plano Standard', 30, 29.90, 'Perfeito para uso regular', true, now()),
  (gen_random_uuid(), 'Plano Premium', 90, 79.90, 'Melhor custo-benefício', true, now()),
  (gen_random_uuid(), 'Plano Ultimate', 365, 299.90, 'Acesso completo por 1 ano', true, now())
ON CONFLICT (id) DO NOTHING;