import React, { useState, useEffect } from 'react';
import { getSubscriptionPlans, SubscriptionPlan } from '../lib/database';
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
  Sparkles
} from 'lucide-react';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  onPurchase: (plan: SubscriptionPlan) => void;
}

function PlanCard({ plan, isPopular, onPurchase }: PlanCardProps) {
  const getPlanIcon = (name: string) => {
    if (name.includes('Básico')) return <Shield className="w-6 h-6" />;
    if (name.includes('Standard')) return <Star className="w-6 h-6" />;
    if (name.includes('Premium')) return <Zap className="w-6 h-6" />;
    if (name.includes('Ultimate')) return <Crown className="w-6 h-6" />;
    return <Shield className="w-6 h-6" />;
  };

  const getPlanGradient = (name: string) => {
    if (name.includes('Básico')) return 'from-blue-500 to-cyan-500';
    if (name.includes('Standard')) return 'from-purple-500 to-pink-500';
    if (name.includes('Premium')) return 'from-orange-500 to-red-500';
    if (name.includes('Ultimate')) return 'from-yellow-400 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  const features = [
    'Processamento ilimitado',
    'Suporte 24/7',
    'API de alta velocidade',
    'Relatórios detalhados',
    'Backup automático'
  ];

  return (
    <div className={`relative bg-gray-900/50 backdrop-blur-xl rounded-2xl border p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl group ${
      isPopular 
        ? 'border-purple-500/50 shadow-purple-500/20 shadow-xl' 
        : 'border-gray-700/50 hover:border-purple-500/30'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3" />
            MAIS POPULAR
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`w-16 h-16 bg-gradient-to-br ${getPlanGradient(plan.name)} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all`}>
          <div className="text-white">
            {getPlanIcon(plan.name)}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-gray-400 text-sm">{plan.description}</p>
      </div>

      <div className="text-center mb-8">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-white">R$ {plan.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 text-purple-300">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{plan.days} dias de acesso</span>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3 text-gray-300">
            <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onPurchase(plan)}
        className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${
          isPopular
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-500/25'
            : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white'
        }`}
      >
        Comprar Agora
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function PublicPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plansData = await getSubscriptionPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPurchaseModal(true);
  };

  const processPurchase = async () => {
    if (!selectedPlan || !customerEmail || !customerPassword) return;

    setPurchaseLoading(true);
    try {
      // Simulate purchase processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Compra realizada com sucesso!\n\nEmail: ${customerEmail}\nPlano: ${selectedPlan.name}\nDuração: ${selectedPlan.days} dias\nValor: R$ ${selectedPlan.price.toFixed(2)}\n\nSeu acesso foi ativado!`);
      
      setShowPurchaseModal(false);
      setCustomerEmail('');
      setCustomerPassword('');
      setSelectedPlan(null);
    } catch (error) {
      alert('Erro ao processar compra. Tente novamente.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/25">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
              TerrraMail
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Pro</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Plataforma profissional de processamento seguro com tecnologia avançada e suporte dedicado
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <div className="text-gray-400">Uptime Garantido</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">10k+</div>
              <div className="text-gray-400">Processamentos/min</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">5k+</div>
              <div className="text-gray-400">Clientes Ativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Escolha Seu Plano
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Planos flexíveis para todas as necessidades. Comece hoje mesmo!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isPopular={index === 1} // Standard plan is most popular
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-white mb-12">
            Por que escolher TerrraMail?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Segurança Máxima</h4>
              <p className="text-gray-400">
                Criptografia de ponta a ponta e proteção avançada contra ameaças
              </p>
            </div>
            <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Alta Performance</h4>
              <p className="text-gray-400">
                Processamento ultrarrápido com infraestrutura de última geração
              </p>
            </div>
            <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Suporte 24/7</h4>
              <p className="text-gray-400">
                Equipe especializada disponível a qualquer momento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/20 p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-8">
              <div className={`w-16 h-16 bg-gradient-to-br ${getPlanGradient(selectedPlan.name)} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <div className="text-white">
                  {getPlanIcon(selectedPlan.name)}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{selectedPlan.name}</h3>
              <div className="flex items-center justify-center gap-2 text-purple-300 mb-4">
                <Clock className="w-4 h-4" />
                <span>{selectedPlan.days} dias de acesso</span>
              </div>
              <div className="text-3xl font-bold text-white">
                R$ {selectedPlan.price.toFixed(2)}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); processPurchase(); }} className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email para acesso
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Senha de acesso
                </label>
                <input
                  type="password"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Senha segura"
                  required
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <h4 className="text-purple-300 font-medium mb-2">Resumo da Compra</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Plano:</span>
                    <span>{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Duração:</span>
                    <span>{selectedPlan.days} dias</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-purple-500/20">
                    <span>Total:</span>
                    <span>R$ {selectedPlan.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={purchaseLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {purchaseLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Finalizar Compra
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function getPlanIcon(name: string) {
    if (name.includes('Básico')) return <Shield className="w-6 h-6" />;
    if (name.includes('Standard')) return <Star className="w-6 h-6" />;
    if (name.includes('Premium')) return <Zap className="w-6 h-6" />;
    if (name.includes('Ultimate')) return <Crown className="w-6 h-6" />;
    return <Shield className="w-6 h-6" />;
  }

  function getPlanGradient(name: string) {
    if (name.includes('Básico')) return 'from-blue-500 to-cyan-500';
    if (name.includes('Standard')) return 'from-purple-500 to-pink-500';
    if (name.includes('Premium')) return 'from-orange-500 to-red-500';
    if (name.includes('Ultimate')) return 'from-yellow-400 to-orange-500';
    return 'from-gray-500 to-gray-600';
  }
}