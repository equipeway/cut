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
  TrendingUp,
  Users,
  ArrowRight,
  LogIn,
  ExternalLink,
  Sparkles
} from 'lucide-react';

// Mock plans for demo
const mockPlans: SubscriptionPlan[] = [
  {
    id: '1',
    name: 'Básico',
    days: 7,
    price: 9.90,
    description: 'Ideal para testes',
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
    description: 'Acesso anual completo',
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

  const features = [
    'Processamento ilimitado',
    'Suporte técnico',
    'API completa',
    'Relatórios detalhados'
  ];

  return (
    <div className={`relative bg-gray-900/80 backdrop-blur-sm rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group ${
      isPopular 
        ? 'border-purple-500/50 shadow-purple-500/20' 
        : 'border-gray-700/50 hover:border-purple-500/30'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            POPULAR
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${
          isPopular ? 'bg-purple-500 text-white' : 'bg-gray-800 text-purple-400'
        }`}>
          {getPlanIcon(plan.name)}
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
        <p className="text-gray-400 text-sm">{plan.description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-white mb-1">
          R$ {plan.price.toFixed(2)}
        </div>
        <div className="flex items-center justify-center gap-1 text-purple-300 text-sm">
          <Clock className="w-3 h-3" />
          {plan.days} dias
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-gray-300 text-sm">
            <Check className="w-4 h-4 text-purple-400" />
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={handlePurchase}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold">TerrraMail</h1>
            </div>
            <Link
              to="/login"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Plataforma de
            <span className="text-purple-500"> Processamento</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Tecnologia avançada para processamento seguro e eficiente
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">99.9%</div>
            <div className="text-gray-400">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">10k+</div>
            <div className="text-gray-400">Processamentos/min</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">5k+</div>
            <div className="text-gray-400">Clientes</div>
          </div>
        </div>

        {/* Plans */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Planos</h3>
            <p className="text-gray-400">Escolha o plano ideal para suas necessidades</p>
          </div>
          
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Seguro</h4>
            <p className="text-gray-400 text-sm">Proteção avançada de dados</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Rápido</h4>
            <p className="text-gray-400 text-sm">Alta performance</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Suporte</h4>
            <p className="text-gray-400 text-sm">Atendimento especializado</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gray-900/50 rounded-xl border border-gray-800 p-12">
          <h4 className="text-2xl font-semibold mb-4">Já tem uma conta?</h4>
          <p className="text-gray-400 mb-8">Acesse sua plataforma agora</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Fazer Login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-gray-500 text-sm">
            © 2025 TerrraMail. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}