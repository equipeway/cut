import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubscriptionPlans, SubscriptionPlan } from '../lib/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  Check, 
  Star, 
  Zap, 
  Crown, 
  Shield,
  Clock,
  LogIn,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

// Mock plans for demo
const mockPlans: SubscriptionPlan[] = [
  {
    id: '1',
    name: 'Básico',
    days: 7,
    price: 9.90,
    description: 'Para testes',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Standard',
    days: 30,
    price: 29.90,
    description: 'Uso regular',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Premium',
    days: 90,
    price: 79.90,
    description: 'Melhor custo-benefício',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Ultimate',
    days: 365,
    price: 299.90,
    description: 'Acesso anual',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

interface PlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
}

function PlanCard({ plan, isPopular }: PlanCardProps) {
  const getPlanIcon = (name: string) => {
    if (name.includes('Básico')) return <Shield className="w-5 h-5" />;
    if (name.includes('Standard')) return <Star className="w-5 h-5" />;
    if (name.includes('Premium')) return <Zap className="w-5 h-5" />;
    if (name.includes('Ultimate')) return <Crown className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  const handlePurchase = () => {
    window.open('https://t.me/monetizei', '_blank');
  };

  return (
    <div className={`relative bg-white rounded-xl border p-6 transition-all duration-200 hover:shadow-lg ${
      isPopular 
        ? 'border-blue-500 shadow-blue-500/10' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Mais Popular
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${
          isPopular ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {getPlanIcon(plan.name)}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{plan.name}</h3>
        <p className="text-gray-500 text-sm">{plan.description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          R$ {plan.price.toFixed(2)}
        </div>
        <div className="flex items-center justify-center gap-1 text-gray-500 text-sm">
          <Clock className="w-3 h-3" />
          {plan.days} dias
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {['Processamento ilimitado', 'Suporte técnico', 'API completa'].map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-gray-600 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={handlePurchase}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        Comprar
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
}

export function HomePage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      
      // Always start with mock plans for immediate display
      setPlans(mockPlans);
      
      // Try to load from Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const plansData = await getSubscriptionPlans();
          if (plansData && plansData.length > 0) {
            setPlans(plansData);
          }
        } catch (error) {
          console.warn('Failed to load plans from Supabase, using mock data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans(mockPlans);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">TerrraMail</h1>
            </div>
            <Link
              to="/login"
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Plataforma de Processamento
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tecnologia avançada para suas necessidades de processamento
          </p>
        </div>

        {/* Plans */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">
            Escolha seu plano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isPopular={index === 1}
              />
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Seguro</h4>
            <p className="text-gray-600">Proteção avançada de dados</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Rápido</h4>
            <p className="text-gray-600">Processamento de alta velocidade</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Confiável</h4>
            <p className="text-gray-600">Suporte 24/7 especializado</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-xl border border-gray-200 p-8">
          <h4 className="text-2xl font-semibold text-gray-900 mb-3">
            Já tem uma conta?
          </h4>
          <p className="text-gray-600 mb-6">
            Acesse sua plataforma de processamento
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Acessar Plataforma
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-gray-500 text-sm">
            © 2025 TerrraMail. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}