import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, LogIn, Crown, Clock, Check, ExternalLink, Zap, Users, ArrowRight, Star } from 'lucide-react';
import { getSubscriptionPlans, SubscriptionPlan } from '../lib/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { mockPlans } from '../data/mockPlans';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
}

function getPlanIcon(planName: string) {
  switch (planName.toLowerCase()) {
    case 'plano básico':
      return <Shield className="w-6 h-6" />;
    case 'plano standard':
      return <Activity className="w-6 h-6" />;
    case 'plano premium':
      return <Zap className="w-6 h-6" />;
    case 'plano ultimate':
      return <Users className="w-6 h-6" />;
    default:
      return <Shield className="w-6 h-6" />;
  }
}

function PlanCard({ plan, isPopular = false }: PlanCardProps) {
  const features = [
    'Processamento seguro',
    'Suporte técnico',
    'Dashboard completo',
    'Relatórios detalhados',
    'API avançada',
    'Monitoramento 24/7'
  ];

  const handlePurchase = () => {
    // Handle purchase logic here
    console.log('Purchase plan:', plan.name);
  };

  return (
    <div className={`relative bg-gray-900/80 backdrop-blur-xl rounded-2xl border p-8 hover:scale-105 transition-all duration-300 group shadow-xl ${
      isPopular ? 'border-purple-500' : 'border-gray-800'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <Star className="w-3 h-3" />
            Mais Popular
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform ${
          isPopular ? 'bg-purple-500 text-white' : 'bg-gray-800 text-purple-400'
        }`}>
          {getPlanIcon(plan.name)}
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-gray-300 text-sm leading-relaxed">{plan.description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-white mb-2">
          R$ {plan.price.toFixed(2)}
        </div>
        <div className="flex items-center justify-center gap-2 text-purple-300 text-sm font-medium">
          <Clock className="w-3 h-3" />
          {plan.days} dias
        </div>
        <div className="mt-3 text-xs text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
          R$ {(plan.price / plan.days).toFixed(2)} por dia
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3 text-gray-300 text-sm p-2 rounded-lg hover:bg-gray-800/30 transition-all">
            <div className="w-5 h-5 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-3 h-3 text-purple-400" />
            </div>
            <span className="font-medium">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handlePurchase}
        className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:scale-105 ${
          isPopular
            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-purple-500/25'
            : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 shadow-gray-500/25'
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TerrraMail Pro</h1>
                <p className="text-purple-300 text-xs">Processamento Avançado</p>
              </div>
            </div>
            <Link
              to="/login"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Info Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-blue-300 text-sm font-medium">Uptime Garantido</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Sistema sempre disponível para suas operações</p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">10k+</div>
                <div className="text-emerald-300 text-sm font-medium">Processamentos/min</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Alta velocidade de processamento garantida</p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">5k+</div>
                <div className="text-purple-300 text-sm font-medium">Clientes Ativos</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Comunidade global de usuários satisfeitos</p>
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            Plataforma de
            <br />
            <span className="text-purple-400">Processamento Avançado</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Tecnologia de ponta para processamento seguro, rápido e confiável com monitoramento em tempo real
          </p>
        </div>

        {/* Plans */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold mb-6">Nossos Planos</h3>
            <p className="text-gray-300 text-lg">Escolha o plano ideal para suas necessidades</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
          <div className="text-center bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/10 hover:scale-105 transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-xl font-bold mb-3 text-white">Máxima Segurança</h4>
            <p className="text-gray-300 text-sm leading-relaxed">Proteção avançada de dados com criptografia de ponta</p>
          </div>
          <div className="text-center bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/10 hover:scale-105 transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-xl font-bold mb-3 text-white">Ultra Rápido</h4>
            <p className="text-gray-300 text-sm leading-relaxed">Performance otimizada para máxima velocidade</p>
          </div>
          <div className="text-center bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/10 hover:scale-105 transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="text-xl font-bold mb-3 text-white">Suporte Premium</h4>
            <p className="text-gray-300 text-sm leading-relaxed">Atendimento especializado 24/7 para sua tranquilidade</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-16 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h4 className="text-3xl font-bold mb-4 text-white">Já tem uma conta?</h4>
          <p className="text-gray-300 mb-10 text-lg">Acesse sua plataforma de processamento agora</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/25 hover:scale-105"
          >
            <LogIn className="w-5 h-5" />
            Acessar Plataforma
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/30 backdrop-blur-xl border-t border-purple-500/20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
              <span className="text-white font-semibold">TerrraMail Pro</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 TerrraMail Pro. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}