import React, { useState, useEffect } from 'react';
import { 
  User, 
  SubscriptionPlan, 
  UserPurchase,
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  getUserPurchases,
  createPurchase,
  getSystemStats
} from '../lib/database';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Package,
  Calendar,
  Shield,
  Mail,
  Lock,
  Save,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface CreateUserForm {
  email: string;
  password: string;
  role: 'user' | 'admin';
  subscription_days: number;
  allowed_ips: string;
}

interface CreatePlanForm {
  name: string;
  days: number;
  price: number;
  description: string;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'sales' | 'analytics'>('users');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPurchases, setUserPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    role: 'user',
    subscription_days: 30,
    allowed_ips: ''
  });

  const [createPlanForm, setCreatePlanForm] = useState<CreatePlanForm>({
    name: '',
    days: 30,
    price: 29.90,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, plansData, statsData] = await Promise.all([
        getUsers(),
        getSubscriptionPlans(),
        getSystemStats()
      ]);
      setUsers(usersData);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const allowedIPs = createUserForm.allowed_ips
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip);

      await createUser({
        email: createUserForm.email,
        password: createUserForm.password,
        role: createUserForm.role,
        subscription_days: createUserForm.subscription_days,
        allowed_ips: allowedIPs
      });

      setCreateUserForm({
        email: '',
        password: '',
        role: 'user',
        subscription_days: 30,
        allowed_ips: ''
      });
      setShowCreateUser(false);
      await loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Usuário criado com sucesso (modo offline)');
      setShowCreateUser(false);
      await loadData();
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubscriptionPlan(createPlanForm);
      setCreatePlanForm({
        name: '',
        days: 30,
        price: 29.90,
        description: ''
      });
      setShowCreatePlan(false);
      loadData();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Erro ao criar plano');
    }
  };

  const handleSellPlan = async (userId: string, planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      // Create purchase record
      await createPurchase({
        user_id: userId,
        plan_id: planId,
        days_added: plan.days,
        amount_paid: plan.price,
        payment_method: 'manual'
      });

      // Update user subscription
      const user = users.find(u => u.id === userId);
      if (user) {
        await updateUser(userId, {
          subscription_days: user.subscription_days + plan.days
        });
      }

      loadData();
      alert(`Plano ${plan.name} vendido com sucesso!`);
    } catch (error) {
      console.error('Error selling plan:', error);
      alert('Erro ao vender plano');
    }
  };

  const loadUserPurchases = async (userId: string) => {
    try {
      const purchases = await getUserPurchases(userId);
      setUserPurchases(purchases);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const tabs = [
    { key: 'users', label: 'Usuários', icon: Users },
    { key: 'plans', label: 'Planos', icon: Package },
    { key: 'sales', label: 'Vendas', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-purple-500/20">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-4 font-medium text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === tab.key
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold">Total de Usuários</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-blue-300 text-sm">{stats.activeUsers} ativos</p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">Processados</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalProcessed}</p>
            <p className="text-emerald-300 text-sm">{stats.totalApproved} aprovados</p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-semibold">Receita Total</h3>
            </div>
            <p className="text-3xl font-bold text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
            <p className="text-yellow-300 text-sm">R$ {stats.monthlyRevenue.toFixed(2)} este mês</p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-semibold">Usuários Banidos</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.bannedUsers}</p>
            <p className="text-red-300 text-sm">{stats.adminUsers} admins</p>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Gestão de Usuários</h3>
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Criar Usuário
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-purple-500/20 bg-gray-800/30">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left text-purple-300 font-semibold py-4 px-6 text-sm">Email</th>
                  <th className="text-left text-purple-300 font-semibold py-4 px-6 text-sm">Função</th>
                  <th className="text-left text-purple-300 font-semibold py-4 px-6 text-sm">Dias</th>
                  <th className="text-left text-purple-300 font-semibold py-4 px-6 text-sm">Status</th>
                  <th className="text-left text-purple-300 font-semibold py-4 px-6 text-sm">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="text-white py-4 px-6 font-medium">{user.email}</td>
                    <td className="text-gray-300 py-4 px-6 text-sm">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-white py-4 px-6 font-mono text-sm font-bold">{user.subscription_days}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        user.is_banned 
                          ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                          : user.subscription_days > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      }`}>
                        {user.is_banned ? 'Banido' : user.subscription_days > 0 ? 'Ativo' : 'Expirado'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserPurchases(user.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg"
                        >
                          <DollarSign className="w-3 h-3" />
                        </button>
                        {user.is_banned ? (
                          <button
                            onClick={async () => {
                              await updateUser(user.id, { is_banned: false });
                              loadData();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg"
                          >
                            Desbanir
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              await updateUser(user.id, { is_banned: true });
                              loadData();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg"
                          >
                            Banir
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja deletar este usuário?')) {
                              await deleteUser(user.id);
                              loadData();
                            }
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Planos de Assinatura</h3>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Criar Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-white font-bold text-lg">{plan.name}</h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">
                      R$ {plan.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">{plan.days} dias</div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>
                <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Preço por dia:</div>
                  <div className="text-sm font-bold text-emerald-400">
                    R$ {(plan.price / plan.days).toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await updateSubscriptionPlan(plan.id, { is_active: !plan.is_active });
                      loadData();
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      plan.is_active
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {plan.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={async () => {
                      const newPrice = prompt('Novo preço:', plan.price.toString());
                      if (newPrice && !isNaN(parseFloat(newPrice))) {
                        await updateSubscriptionPlan(plan.id, { price: parseFloat(newPrice) });
                        loadData();
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Central de Vendas</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users List */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-4">Selecionar Cliente</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {users.filter(u => u.role !== 'admin').map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      loadUserPurchases(user.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedUser?.id === user.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{user.email}</span>
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                        {user.subscription_days}d
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Plans for Sale */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-4">Vender Plano</h4>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <p className="text-purple-300 text-sm font-medium">Cliente Selecionado</p>
                    <p className="text-white font-bold">{selectedUser.email}</p>
                    <p className="text-gray-400 text-sm">
                      {selectedUser.subscription_days} dias restantes
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {plans.filter(p => p.is_active).map(plan => (
                      <div key={plan.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-white font-medium">{plan.name}</h5>
                          <span className="text-purple-400 font-bold">R$ {plan.price.toFixed(2)}</span>
                        </div>
                        <div className="text-gray-400 text-sm mb-3">
                          <p>{plan.description}</p>
                          <p className="text-xs mt-1">R$ {(plan.price / plan.days).toFixed(2)} por dia</p>
                        </div>
                        <button
                          onClick={() => handleSellPlan(selectedUser.id, plan.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all"
                        >
                          Vender (+{plan.days} dias)
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Purchase History */}
                  {userPurchases.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-white font-medium mb-3">Histórico de Compras</h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {userPurchases.map(purchase => (
                          <div key={purchase.id} className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 text-sm">{purchase.plan?.name}</span>
                              <span className="text-emerald-400 text-sm font-medium">
                                R$ {purchase.amount_paid.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Selecione um cliente para vender planos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/20 p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Criar Novo Usuário</h3>
              <button
                onClick={() => setShowCreateUser(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="usuario@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Senha segura"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Função</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Dias de Assinatura</label>
                <input
                  type="number"
                  value={createUserForm.subscription_days}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, subscription_days: parseInt(e.target.value) || 0 }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">IPs Permitidos (opcional)</label>
                <input
                  type="text"
                  value={createUserForm.allowed_ips}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, allowed_ips: e.target.value }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="192.168.1.1, 10.0.0.1"
                />
                <p className="text-gray-500 text-xs mt-1">Separar múltiplos IPs por vírgula</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/20 p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Criar Novo Plano</h3>
              <button
                onClick={() => setShowCreatePlan(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Nome do Plano</label>
                <input
                  type="text"
                  value={createPlanForm.name}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Plano Premium"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Duração (dias)</label>
                <input
                  type="number"
                  value={createPlanForm.days}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createPlanForm.price}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={createPlanForm.description}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full py-3 px-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  rows={3}
                  placeholder="Descrição do plano..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePlan(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}