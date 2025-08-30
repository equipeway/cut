import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getAllUsers, 
  getAllSubscriptionPlans, 
  createSubscriptionPlan, 
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAllUserPurchases,
  createUserPurchase,
  updateUserSubscription,
  banUser,
  unbanUser
} from '../lib/database';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscription_days: number;
  is_banned: boolean;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string;
  is_active: boolean;
}

interface UserPurchase {
  id: string;
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method: string;
  created_at: string;
}

export function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'purchases'>('users');

  // Form states
  const [newPlan, setNewPlan] = useState({
    name: '',
    days: 0,
    price: 0,
    description: ''
  });

  const [newPurchase, setNewPurchase] = useState({
    user_email: '',
    plan_id: '',
    payment_method: 'manual'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, plansData, purchasesData] = await Promise.all([
        getAllUsers(),
        getAllSubscriptionPlans(),
        isAdmin ? getAllUserPurchases() : Promise.resolve([])
      ]);

      setUsers(usersData || []);
      setPlans(plansData || []);
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubscriptionPlan(
        newPlan.name,
        newPlan.days,
        newPlan.price,
        newPlan.description
      );
      setNewPlan({ name: '', days: 0, price: 0, description: '' });
      loadData();
    } catch (error) {
      console.error('Erro ao criar plano:', error);
    }
  };

  const handleTogglePlan = async (planId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      console.log(`Toggling plan ${planId} from ${currentStatus} to ${newStatus}`);
      
      const result = await updateSubscriptionPlan(planId, { is_active: newStatus });
      console.log('Update result:', result);
      
      if (result) {
        console.log('Plan updated successfully, reloading data...');
        await loadData();
      } else {
        console.error('Failed to update plan - no result returned');
      }
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Tem certeza que deseja deletar este plano?')) {
      try {
        await deleteSubscriptionPlan(planId);
        loadData();
      } catch (error) {
        console.error('Erro ao deletar plano:', error);
      }
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedPlan = plans.find(p => p.id === newPurchase.plan_id);
      if (!selectedPlan) return;

      await createUserPurchase(
        newPurchase.user_email,
        newPurchase.plan_id,
        selectedPlan.days,
        selectedPlan.price,
        newPurchase.payment_method
      );

      await updateUserSubscription(newPurchase.user_email, selectedPlan.days);
      
      setNewPurchase({ user_email: '', plan_id: '', payment_method: 'manual' });
      loadData();
    } catch (error) {
      console.error('Erro ao criar compra:', error);
    }
  };

  const handleBanUser = async (userId: string, email: string) => {
    if (confirm(`Tem certeza que deseja banir o usuário ${email}?`)) {
      try {
        await banUser(userId);
        loadData();
      } catch (error) {
        console.error('Erro ao banir usuário:', error);
      }
    }
  };

  const handleUnbanUser = async (userId: string, email: string) => {
    if (confirm(`Tem certeza que deseja desbanir o usuário ${email}?`)) {
      try {
        await unbanUser(userId);
        loadData();
      } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? 'Painel Administrativo' : 'Dashboard'}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {user?.email} ({user?.role})
              </span>
              {user?.subscription_days && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  {user.subscription_days} dias restantes
                </span>
              )}
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isAdmin ? (
          <div className="px-4 py-6 sm:px-0">
            {/* Admin Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {['users', 'plans', 'purchases'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'users' && 'Usuários'}
                    {tab === 'plans' && 'Planos'}
                    {tab === 'purchases' && 'Compras'}
                  </button>
                ))}
              </nav>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Gerenciar Usuários
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dias de Assinatura
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.subscription_days}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.is_banned 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.is_banned ? 'Banido' : 'Ativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {user.is_banned ? (
                                <button
                                  onClick={() => handleUnbanUser(user.id, user.email)}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                >
                                  Desbanir
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanUser(user.id, user.email)}
                                  className="text-red-600 hover:text-red-900 mr-3"
                                >
                                  Banir
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Plans Tab */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                {/* Create Plan Form */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Criar Novo Plano
                    </h3>
                    <form onSubmit={handleCreatePlan} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nome</label>
                          <input
                            type="text"
                            value={newPlan.name}
                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Dias</label>
                          <input
                            type="number"
                            value={newPlan.days}
                            onChange={(e) => setNewPlan({ ...newPlan, days: parseInt(e.target.value) })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newPlan.price}
                            onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Descrição</label>
                          <input
                            type="text"
                            value={newPlan.description}
                            onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Criar Plano
                      </button>
                    </form>
                  </div>
                </div>

                {/* Plans List */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Planos de Assinatura
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dias
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Preço
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {plans.map((plan) => (
                            <tr key={plan.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {plan.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {plan.days}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                R$ {plan.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  plan.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {plan.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleTogglePlan(plan.id, plan.is_active)}
                                  className={`mr-3 ${
                                    plan.is_active 
                                      ? 'text-red-600 hover:text-red-900' 
                                      : 'text-green-600 hover:text-green-900'
                                  }`}
                                >
                                  {plan.is_active ? 'Desativar' : 'Ativar'}
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Deletar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-6">
                {/* Create Purchase Form */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Adicionar Compra Manual
                    </h3>
                    <form onSubmit={handleCreatePurchase} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email do Usuário</label>
                          <input
                            type="email"
                            value={newPurchase.user_email}
                            onChange={(e) => setNewPurchase({ ...newPurchase, user_email: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Plano</label>
                          <select
                            value={newPurchase.plan_id}
                            onChange={(e) => setNewPurchase({ ...newPurchase, plan_id: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Selecione um plano</option>
                            {plans.filter(p => p.is_active).map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} - {plan.days} dias - R$ {plan.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Método de Pagamento</label>
                          <select
                            value={newPurchase.payment_method}
                            onChange={(e) => setNewPurchase({ ...newPurchase, payment_method: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="manual">Manual</option>
                            <option value="pix">PIX</option>
                            <option value="credit_card">Cartão de Crédito</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Adicionar Compra
                      </button>
                    </form>
                  </div>
                </div>

                {/* Purchases List */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Histórico de Compras
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Usuário
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dias
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Método
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {purchases.map((purchase) => (
                            <tr key={purchase.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {users.find(u => u.id === purchase.user_id)?.email || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {purchase.days_added}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                R$ {purchase.amount_paid.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {purchase.payment_method}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* User Dashboard */
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Minha Conta
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dias de Assinatura Restantes</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.subscription_days || 0} dias</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status da Conta</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user?.is_banned 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user?.is_banned ? 'Banida' : 'Ativa'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Plans */}
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Planos Disponíveis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.filter(p => p.is_active).map((plan) => (
                    <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      <div className="mt-4">
                        <span className="text-2xl font-bold text-gray-900">R$ {plan.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-600 ml-1">/ {plan.days} dias</span>
                      </div>
                      <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        Comprar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}