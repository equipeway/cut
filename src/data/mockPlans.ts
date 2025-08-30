import { SubscriptionPlan } from '../lib/database';

export const mockPlans: SubscriptionPlan[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Plano Básico',
    days: 7,
    price: 9.90,
    description: 'Ideal para testes e uso básico',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Plano Standard',
    days: 30,
    price: 29.90,
    description: 'Perfeito para uso regular',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Plano Premium',
    days: 90,
    price: 79.90,
    description: 'Melhor custo-benefício',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Plano Ultimate',
    days: 365,
    price: 299.90,
    description: 'Acesso completo por 1 ano',
    is_active: true,
    created_at: new Date().toISOString()
  }
];