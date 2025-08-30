/*
  # Add default subscription plans

  1. New Data
    - Insert default subscription plans with competitive pricing
    - Plans range from basic to premium tiers
    - All plans are active by default

  2. Plans Structure
    - Basic: 7 days for R$ 9.90
    - Standard: 30 days for R$ 29.90  
    - Premium: 90 days for R$ 79.90
    - Ultimate: 365 days for R$ 299.90
*/

INSERT INTO subscription_plans (name, days, price, description, is_active) VALUES
('Plano Básico', 7, 9.90, 'Acesso por 7 dias - Ideal para testar o sistema', true),
('Plano Standard', 30, 29.90, 'Acesso por 30 dias - Mais popular entre usuários', true),
('Plano Premium', 90, 79.90, 'Acesso por 90 dias - Melhor custo-benefício', true),
('Plano Ultimate', 365, 299.90, 'Acesso por 1 ano completo - Máximo desconto', true)
ON CONFLICT DO NOTHING;