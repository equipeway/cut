import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getSystemStats,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createPurchase,
  User,
  SubscriptionPlan
} from '../lib/database';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Crown, 
  Ban, 
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Activity,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'stats'>('users');

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    subscription_days: 0
  });

  const [newPlan, setNewPlan] = useState({
    name: '',
    days: 30,
    price: 0,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const addNotification = (type: Notification['type'], message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message
    };
    setNotifications(prev => [notification, ...prev]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

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
      console.error('Error loading admin data:', error);
      addNotification('error', 'Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(newUser);
      setNewUser({ email: '', password: '', role: 'user', subscription_days: 0 });
      setShowCreateUser(false);
      await loadData();
      addNotification('success', 'Usuário criado com sucesso');
    } catch (error) {
      console.error('Error creating user:', error);
      addNotification('error', 'Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateUser(userId, updates);
      await loadData();
      setEditingUser(null);
      addNotification('success', 'Usuário atualizado com sucesso');
    } catch (error) {
      console.error('Error updating user:', error);
      addNotification('error', 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      await deleteUser(userId);
      await loadData();
      addNotification('success', 'Usuário deletado com sucesso');
    } catch (error) {
      console.error('Error deleting user:', error);
      addNotification('error', 'Erro ao deletar usuário');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubscriptionPlan(newPlan);
      setNewPlan({ name: '', days: 30, price: 0, description: '' });
      setShowCreatePlan(false);
      await loadData();
      addNotification('success', 'Plano criado com sucesso');
    } catch (error) {
      console.error('Error creating plan:', error);
      addNotification('error', 'Erro ao criar plano');
    }
  };

  const handleUpdatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      await updateSubscriptionPlan(planId, updates);
      await loadData();
      setEditingPlan(null);
      addNotification('success', 'Plano atualizado com sucesso');
    } catch (error) {
      console.error('Error updating plan:', error);
      addNotification('error', 'Erro ao atualizar plano');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja deletar este plano?')) return;
    
    try {
      await deleteSubscriptionPlan(planId);
      await loadData();
      addNotification('success', 'Plano deletado com sucesso');
    } catch (error) {
      console.error('Error deleting plan:', error);
      addNotification('error', 'Erro ao deletar plano');
    }
  };

  const handleAddDays = async (userId: string, days: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      await updateUser(userId, {
        subscription_days: user.subscription_days + days
      });
      await loadData();
      addNotification('success', `${days} dias adicionados ao usuário`);
    } catch (error) {
      console.error('Error adding days:', error);
      addNotification('error', 'Erro ao adicionar dias');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white">Carregando dados administrativos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                notification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {notification.type === 'error' && <XCircle className="w-4 h-4" />}
              {notification.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-800/30 p-2 rounded-2xl">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'users' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'plans' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Package className="w-4 h-4" />
          Planos
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stats' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Estatísticas
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Create User Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Gerenciar Usuários ({users.length})
            </h3>
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>

          {/* Create User Modal */}
          {showCreateUser && (
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-white">Criar Novo Usuário</h4>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as 'user' | 'admin'})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  type="number"
                  placeholder="Dias de assinatura"
                  value={newUser.subscription_days}
                  onChange={(e) => setNewUser({...newUser, subscription_days: parseInt(e.target.value) || 0})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Criar Usuário
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-semibold">Usuário</th>
                    <th className="text-left p-4 text-gray-300 font-semibold">Role</th>
                    <th className="text-left p-4 text-gray-300 font-semibold">Dias</th>
                    <th className="text-left p-4 text-gray-300 font-semibold">Status</th>
                    <th className="text-left p-4 text-gray-300 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.email}</p>
                            <p className="text-gray-400 text-xs">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {user.role === 'admin' ? (
                            <div className="flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Admin
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              User
                            </div>
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-mono">{user.subscription_days}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                          user.is_banned 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {user.is_banned ? (
                            <>
                              <Ban className="w-3 h-3" />
                              Banido
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Ativo
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAddDays(user.id, 30)}
                            className="text-emerald-400 hover:text-emerald-300 p-2 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Adicionar 30 dias"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Gerenciar Planos ({plans.length})
            </h3>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          </div>

          {/* Create Plan Modal */}
          {showCreatePlan && (
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-white">Criar Novo Plano</h4>
                <button
                  onClick={() => setShowCreatePlan(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome do plano"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
                <input
                  type="number"
                  placeholder="Dias"
                  value={newPlan.days}
                  onChange={(e) => setNewPlan({...newPlan, days: parseInt(e.target.value) || 0})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({...newPlan, price: parseFloat(e.target.value) || 0})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
                <input
                  type="text"
                  placeholder="Descrição"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Criar Plano
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-500/10 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Preço:</span>
                    <span className="text-white font-bold">R$ {plan.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Duração:</span>
                    <span className="text-white font-bold">{plan.days} dias</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.is_active 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Estatísticas do Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-blue-300 font-semibold">Total de Usuários</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-emerald-300 font-semibold">Usuários Ativos</p>
                  <p className="text-3xl font-bold text-white">{stats.activeUsers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-purple-300 font-semibold">Total Processado</p>
                  <p className="text-3xl font-bold text-white">{stats.totalProcessed || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-yellow-300 font-semibold">Receita Total</p>
                  <p className="text-3xl font-bold text-white">R$ {(stats.totalRevenue || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/20 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-white">Editar Usuário</h4>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin'})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Dias de Assinatura</label>
                <input
                  type="number"
                  value={editingUser.subscription_days}
                  onChange={(e) => setEditingUser({...editingUser, subscription_days: parseInt(e.target.value) || 0})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="banned"
                  checked={editingUser.is_banned}
                  onChange={(e) => setEditingUser({...editingUser, is_banned: e.target.checked})}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="banned" className="text-gray-300 text-sm">Usuário banido</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleUpdateUser(editingUser.id, editingUser)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/20 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-white">Editar Plano</h4>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Nome</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Dias</label>
                <input
                  type="number"
                  value={editingPlan.days}
                  onChange={(e) => setEditingPlan({...editingPlan, days: parseInt(e.target.value) || 0})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Preço</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Descrição</label>
                <input
                  type="text"
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={editingPlan.is_active}
                  onChange={(e) => setEditingPlan({...editingPlan, is_active: e.target.checked})}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="active" className="text-gray-300 text-sm">Plano ativo</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleUpdatePlan(editingPlan.id, editingPlan)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingPlan(null)}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}