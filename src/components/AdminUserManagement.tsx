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
  AlertTriangle,
  BarChart3,
  Activity,
  Clock
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
      alert(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'plans', label: 'Planos', icon: Package },
    { key: 'sales', label: 'Vendas', icon: DollarSign }
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
      {/* Enhanced Tab Navigation */}
      <div className="bg-gray-800/30 rounded-2xl p-2 border border-purple-500/20">
        <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 rounded-xl ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-8">
          {/* Main Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl p-6 border border-blue-500/20 hover:scale-105 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-300 font-medium">USUÁRIOS</div>
                  <div className="text-xs text-emerald-400">+{stats.activeUsers} ativos</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.totalUsers}</div>
              <div className="text-blue-300 text-sm font-medium">Total de Usuários</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl p-6 border border-emerald-500/20 hover:scale-105 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-300 font-medium">PROCESSADOS</div>
                  <div className="text-xs text-emerald-400">+{stats.totalApproved} aprovados</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.totalProcessed}</div>
              <div className="text-emerald-300 text-sm font-medium">Total Processados</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-2xl p-6 border border-yellow-500/20 hover:scale-105 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-yellow-300 font-medium">RECEITA</div>
                  <div className="text-xs text-emerald-400">+R$ {stats.monthlyRevenue.toFixed(2)} mês</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">R$ {stats.totalRevenue.toFixed(2)}</div>
              <div className="text-yellow-300 text-sm font-medium">Receita Total</div>
            </div>

            <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-2xl p-6 border border-red-500/20 hover:scale-105 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-red-300 font-medium">SEGURANÇA</div>
                  <div className="text-xs text-purple-400">{stats.adminUsers} admins</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.bannedUsers}</div>
              <div className="text-red-300 text-sm font-medium">Usuários Banidos</div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Taxa de Aprovação
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Aprovados</span>
                  <span className="text-emerald-400 font-medium">{stats.totalApproved}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.totalProcessed ? (stats.totalApproved / stats.totalProcessed) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-center text-2xl font-bold text-white">
                  {stats.totalProcessed ? Math.round((stats.totalApproved / stats.totalProcessed) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Atividade Recente
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-sm">Sistema operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-sm">{stats.activeUsers} usuários online</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-sm">Processamento ativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Gestão de Usuários</h3>
                <p className="text-gray-400 text-sm">Controle completo de contas</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Criar Usuário
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-gray-800/30 shadow-xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600/20 to-purple-800/20">
                <tr>
                  <th className="text-left text-white font-bold py-6 px-8 text-sm">USUÁRIO</th>
                  <th className="text-left text-white font-bold py-6 px-8 text-sm">FUNÇÃO</th>
                  <th className="text-left text-white font-bold py-6 px-8 text-sm">ASSINATURA</th>
                  <th className="text-left text-white font-bold py-6 px-8 text-sm">STATUS</th>
                  <th className="text-left text-white font-bold py-6 px-8 text-sm">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10 bg-gray-900/30">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition-all duration-200 group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm font-bold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.email}</div>
                          <div className="text-gray-400 text-xs">
                            Criado em {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-mono text-sm font-bold">
                          {user.subscription_days} dias
                        </span>
                      </div>
                      <div className="w-20 bg-gray-700 rounded-full h-1.5 mt-2">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: `${Math.min(user.subscription_days / 365 * 100, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-6 px-8">
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
                    <td className="py-6 px-8">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserPurchases(user.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg"
                          title="Gerenciar vendas"
                        >
                          <DollarSign className="w-3 h-3" />
                        </button>
                        {user.is_banned ? (
                          <button
                            onClick={async () => {
                              await updateUser(user.id, { is_banned: false });
                              loadData();
                            }}
                            title="Desbanir usuário"
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
                            title="Banir usuário"
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
                          title="Deletar usuário"
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
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Planos de Assinatura</h3>
                <p className="text-gray-400 text-sm">Gerenciar produtos e preços</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Criar Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20 hover:scale-105 transition-all duration-200 group shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-white font-bold text-lg">{plan.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                      R$ {plan.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-purple-300 font-medium">{plan.days} dias</div>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">{plan.description}</p>
                </div>
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-xl border border-purple-500/20">
                  <div className="text-xs text-purple-300 mb-2 font-medium">CUSTO DIÁRIO</div>
                  <div className="text-lg font-bold text-white">
                    R$ {(plan.price / plan.days).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">por dia de acesso</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await updateSubscriptionPlan(plan.id, { is_active: !plan.is_active });
                      loadData();
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all shadow-lg ${
                      plan.is_active
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
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
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/25"
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
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Central de Vendas</h3>
              <p className="text-gray-400 text-sm">Gerenciar vendas e assinaturas</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users List */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20 shadow-xl">
              <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Selecionar Cliente
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {users.filter(u => u.role !== 'admin').map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      loadUserPurchases(user.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all border hover:scale-[1.02] ${
                      selectedUser?.id === user.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-lg'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs opacity-70">{user.subscription_days} dias restantes</div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${user.subscription_days > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Plans for Sale */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20 shadow-xl">
              <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Vender Plano
              </h4>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {selectedUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-purple-300 text-xs font-medium">CLIENTE SELECIONADO</p>
                        <p className="text-white font-bold">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Dias restantes:</span>
                        <span className="text-white font-bold">{selectedUser.subscription_days}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {plans.filter(p => p.is_active).map(plan => (
                      <div key={plan.id} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/50 hover:bg-gray-700/70 transition-all group">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Package className="w-4 h-4 text-white" />
                            </div>
                            <h5 className="text-white font-bold">{plan.name}</h5>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-purple-400">R$ {plan.price.toFixed(2)}</span>
                            <div className="text-xs text-gray-400">{plan.days} dias</div>
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-gray-300 text-sm mb-2">{plan.description}</p>
                          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                            <div className="text-xs text-purple-300 mb-1">Custo por dia</div>
                            <div className="text-sm font-bold text-white">R$ {(plan.price / plan.days).toFixed(2)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSellPlan(selectedUser.id, plan.id)}
                          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-500/25 hover:scale-105"
                        >
                          💰 Vender (+{plan.days} dias)
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Purchase History */}
                  {userPurchases.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        Histórico de Compras
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {userPurchases.map(purchase => (
                          <div key={purchase.id} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30 hover:bg-gray-700/50 transition-all">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white text-sm font-medium">{purchase.plan?.name}</span>
                              <span className="text-emerald-400 text-sm font-bold">
                                R$ {purchase.amount_paid.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-xs">
                                {new Date(purchase.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-purple-300 text-xs">
                                +{purchase.days_added} dias
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 font-medium">Selecione um cliente</p>
                  <p className="text-gray-500 text-sm">para gerenciar vendas e planos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Criar Novo Usuário</h3>
                  <p className="text-purple-300 text-sm">Adicionar conta ao sistema</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateUser(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-semibold mb-3">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="usuario@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Senha segura"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Função</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Dias de Assinatura</label>
                <input
                  type="number"
                  value={createUserForm.subscription_days}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, subscription_days: parseInt(e.target.value) || 0 }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">IPs Permitidos (opcional)</label>
                <input
                  type="text"
                  value={createUserForm.allowed_ips}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, allowed_ips: e.target.value }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="192.168.1.1, 10.0.0.1"
                />
                <p className="text-gray-400 text-xs mt-2">Separar múltiplos IPs por vírgula</p>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-medium transition-all shadow-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Criar Novo Plano</h3>
                  <p className="text-purple-300 text-sm">Adicionar produto ao sistema</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatePlan(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-semibold mb-3">Nome do Plano</label>
                <input
                  type="text"
                  value={createPlanForm.name}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Plano Premium"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Duração (dias)</label>
                <input
                  type="number"
                  value={createPlanForm.days}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createPlanForm.price}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-3">Descrição</label>
                <textarea
                  value={createPlanForm.description}
                  onChange={(e) => setCreatePlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full py-4 px-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
                  rows={3}
                  placeholder="Descrição do plano..."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreatePlan(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-medium transition-all shadow-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105"
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