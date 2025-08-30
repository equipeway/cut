import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ProcessingSession,
  getUserSession,
  createSession,
  updateSession
} from '../lib/database';
import { AdminUserManagement } from './AdminUserManagement';
import { 
  Play, 
  Square, 
  LogOut, 
  Settings, 
  X, 
  CheckCircle,
  XCircle,
  Clock,
  Database,
  TrendingUp,
  AlertTriangle,
  Shield,
  Zap,
  Activity,
  BarChart3,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  Globe,
  Lock,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ProcessingResult {
  input: string;
  approved: boolean;
  message?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

interface InfoBox {
  id: string;
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  trend?: string;
  description?: string;
}

export function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [inputList, setInputList] = useState('');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [session, setSession] = useState<ProcessingSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [systemInfo, setSystemInfo] = useState({
    cpuUsage: 45,
    memoryUsage: 62,
    networkStatus: 'online',
    serverLoad: 23,
    activeConnections: 156,
    uptime: '99.9%'
  });

  useEffect(() => {
    if (user) {
      loadSession();
      // Simulate real-time system updates
      const interval = setInterval(() => {
        setSystemInfo(prev => ({
          ...prev,
          cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
          memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 8)),
          serverLoad: Math.max(10, Math.min(50, prev.serverLoad + (Math.random() - 0.5) * 6)),
          activeConnections: Math.max(100, Math.min(300, prev.activeConnections + Math.floor((Math.random() - 0.5) * 20)))
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const addNotification = (type: Notification['type'], message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const loadSession = async () => {
    if (!user) return;

    let userSession = await getUserSession(user.id);
    if (!userSession) {
      userSession = await createSession(user.id);
    }
    setSession(userSession);
  };

  const updateSessionData = async (updates: Partial<ProcessingSession>) => {
    if (!session) return;

    const updatedSession = await updateSession(session.id, updates);
    if (updatedSession) {
      setSession(updatedSession);
    }
  };

  const startProcessing = async () => {
    let lines = inputList.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      addNotification('warning', 'Please enter items to process');
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgress(0);
    
    await updateSessionData({
      loaded_count: lines.length,
      tested_count: 0,
      approved_count: 0,
      rejected_count: 0,
      is_active: true
    });

    addNotification('info', `Starting processing of ${lines.length} items`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      setCurrentItem(line);
      setProgress(((i + 1) / lines.length) * 100);
      // Remove linha processada da lista
      setInputList(prev => {
        const arr = prev.split('\n').filter(l => l.trim());
        arr.shift();
        return arr.join('\n');
      });
      try {
        let approved = false;
        let message = '';

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'https://9cf09ef93437.ngrok-free.app/api/check';
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify({ data: line })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          approved = result.status === 'approved' || result.status === 'Aprovada' || result.approved === true;
          message = result.message || result.retorno || result.status;
        } catch (apiError) {
          console.warn('API unavailable, using mock processing:', apiError);
          
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line);
          const hasValidDomain = line.includes('.com') || line.includes('.org') || line.includes('.net');
          
          approved = isEmail && hasValidDomain;
          message = approved ? 'Valid email format' : 'Invalid format or domain';
          
          if (i === 0) {
            addNotification('warning', 'API unavailable - using offline mode');
          }
        }
        
        const newResult: ProcessingResult = {
          input: line,
          approved,
          message
        };

        setResults(prev => [...prev, newResult]);

        if (session) {
          const newApproved = session.approved_count + (approved ? 1 : 0);
          const newRejected = session.rejected_count + (!approved ? 1 : 0);
          const newTested = session.tested_count + 1;

          await updateSessionData({
            approved_count: newApproved,
            rejected_count: newRejected,
            tested_count: newTested
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Processing error:', error);
        
        let errorMessage = 'Network error';
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to processing server';
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        const newResult: ProcessingResult = {
          input: line,
          approved: false,
          message: errorMessage
        };
        setResults(prev => [...prev, newResult]);
        
        if (i === 0) {
          addNotification('error', `Connection failed: ${errorMessage}`);
        }
        
        if (session) {
          const newRejected = session.rejected_count + 1;
          const newTested = session.tested_count + 1;

          await updateSessionData({
            rejected_count: newRejected,
            tested_count: newTested
          });
        }
      }
    }

    setIsProcessing(false);
    setCurrentItem('');
    setProgress(100);
    await updateSessionData({ is_active: false });
    
    const finalResults = results.length > 0 ? results : [];
    const approvedCount = finalResults.filter(r => r.approved).length;
    addNotification('success', `Processing complete: ${approvedCount} approved, ${results.length - approvedCount} rejected`);
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setCurrentItem('');
    updateSessionData({ is_active: false });
    addNotification('warning', 'Processing stopped by user');
  };

  const clearResults = () => {
    setResults([]);
    setInputList('');
    setProgress(0);
    if (session) {
      updateSessionData({
        approved_count: 0,
        rejected_count: 0,
        loaded_count: 0,
        tested_count: 0
      });
    }
    addNotification('info', 'Results cleared');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'error': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default: return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    }
  };

  // Info boxes data
  const infoBoxes: InfoBox[] = [
    {
      id: 'processed',
      title: 'Processados Hoje',
      value: session?.tested_count || 0,
      icon: Activity,
      color: 'blue',
      trend: '+12%',
      description: 'Total de itens processados'
    },
    {
      id: 'approved',
      title: 'Taxa de Aprovação',
      value: session?.tested_count ? `${Math.round((session.approved_count / session.tested_count) * 100)}%` : '0%',
      icon: CheckCircle,
      color: 'emerald',
      trend: '+5%',
      description: 'Percentual de aprovação'
    },
    {
      id: 'speed',
      title: 'Velocidade Média',
      value: '2.3s',
      icon: Zap,
      color: 'yellow',
      trend: '-0.2s',
      description: 'Tempo médio por item'
    },
    {
      id: 'uptime',
      title: 'Uptime do Sistema',
      value: systemInfo.uptime,
      icon: Server,
      color: 'purple',
      trend: 'Estável',
      description: 'Disponibilidade do sistema'
    }
  ];

  const systemInfoBoxes: InfoBox[] = [
    {
      id: 'cpu',
      title: 'CPU',
      value: `${systemInfo.cpuUsage}%`,
      icon: Cpu,
      color: systemInfo.cpuUsage > 70 ? 'red' : systemInfo.cpuUsage > 50 ? 'yellow' : 'emerald',
      description: 'Uso do processador'
    },
    {
      id: 'memory',
      title: 'Memória',
      value: `${systemInfo.memoryUsage}%`,
      icon: HardDrive,
      color: systemInfo.memoryUsage > 80 ? 'red' : systemInfo.memoryUsage > 60 ? 'yellow' : 'emerald',
      description: 'Uso da memória RAM'
    },
    {
      id: 'network',
      title: 'Rede',
      value: systemInfo.networkStatus === 'online' ? 'Online' : 'Offline',
      icon: Wifi,
      color: systemInfo.networkStatus === 'online' ? 'emerald' : 'red',
      description: 'Status da conexão'
    },
    {
      id: 'connections',
      title: 'Conexões',
      value: systemInfo.activeConnections,
      icon: Globe,
      color: 'blue',
      description: 'Conexões ativas'
    }
  ];

  const getInfoBoxColors = (color: string) => {
    const colors = {
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      red: 'bg-red-500/10 border-red-500/20 text-red-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm pointer-events-none">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`${getNotificationColors(notification.type)} border rounded-xl p-4 backdrop-blur-xl shadow-lg transform transition-all duration-300 ease-out pointer-events-auto`}
            style={{
              animation: 'slideInFromRight 0.3s ease-out'
            }}
          >
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Header */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">TerrraMail Pro</h1>
                <p className="text-purple-300 text-xs">Plataforma de Processamento Avançado</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* User Info Card */}
              <div className="bg-gray-800/50 rounded-xl px-4 py-3 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user?.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user?.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {user?.role}
                      </span>
                      <span className="text-purple-300 text-xs">
                        {user?.subscription_days} dias
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-105"
                  >
                    <Settings className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800/50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {showAdmin && isAdmin ? (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden">
            {/* Enhanced Admin Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 p-8 border-b border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Painel Administrativo</h2>
                    <p className="text-purple-300 text-sm">Controle total do sistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdmin(false)}
                  className="text-gray-400 hover:text-white p-3 hover:bg-gray-800/50 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* System Info Boxes */}
            <div className="p-8 border-b border-purple-500/10">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Status do Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemInfoBoxes.map(box => (
                  <div key={box.id} className={`${getInfoBoxColors(box.color)} border rounded-xl p-4 backdrop-blur-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <box.icon className="w-5 h-5" />
                      <span className="text-xs opacity-70">{box.description}</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{box.value}</div>
                    <div className="text-sm font-medium">{box.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Content */}
            <div className="p-8">
              <AdminUserManagement />
            </div>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto p-6">
          {/* Performance Info Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {infoBoxes.map(box => (
              <div key={box.id} className={`${getInfoBoxColors(box.color)} border rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer group`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getInfoBoxColors(box.color)} border`}>
                    <box.icon className="w-6 h-6" />
                  </div>
                  {box.trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      box.trend.startsWith('+') ? 'bg-emerald-500/20 text-emerald-300' : 
                      box.trend.startsWith('-') ? 'bg-red-500/20 text-red-300' : 
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {box.trend}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">
                  {box.value}
                </div>
                <div className="text-sm font-medium mb-1">{box.title}</div>
                {box.description && (
                  <div className="text-xs opacity-70">{box.description}</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Processing Area */}
            <div className="xl:col-span-2 space-y-8">
              {/* Enhanced Input Section */}
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Centro de Processamento</h3>
                    <p className="text-gray-400 text-sm">Insira os dados para análise avançada</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-white text-sm font-semibold flex items-center gap-2">
                      Lista de Processamento
                    </label>
                    <div className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                      {inputList.split('\n').filter(line => line.trim()).length} itens carregados
                    </div>
                  </div>
                  <textarea
                    value={inputList}
                    onChange={(e) => setInputList(e.target.value)}
                    placeholder="Digite os itens para processar (um por linha)..."
                    className="w-full h-48 bg-gray-800/50 border border-purple-500/30 rounded-2xl p-6 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all backdrop-blur-sm font-mono text-sm leading-relaxed"
                  />
                </div>
                
                {/* Enhanced Progress Bar */}
                {(isProcessing || progress > 0) && (
                  <div className="mb-8 bg-gray-800/30 rounded-2xl p-6 border border-purple-500/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-white font-semibold">
                          {isProcessing ? 'Processando...' : 'Concluído'}
                        </span>
                      </div>
                      <span className="text-white text-lg font-bold font-mono">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-500 ease-out shadow-lg"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {currentItem && (
                      <div className="mt-4 bg-gray-700/50 rounded-xl p-4 border border-gray-600/30">
                        <p className="text-gray-300 text-sm mb-1">Processando agora:</p>
                        <p className="text-white font-mono text-sm break-all">{currentItem}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Enhanced Control Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={startProcessing}
                    disabled={isProcessing || !inputList.trim()}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-5 h-5" />
                    Iniciar Processamento
                  </button>
                  
                  <button
                    onClick={stopProcessing}
                    disabled={!isProcessing}
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Square className="w-5 h-5" />
                    Parar
                  </button>

                  <button
                    onClick={clearResults}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <X className="w-5 h-5" />
                    Limpar
                  </button>
                </div>
              </div>

              {/* Enhanced Results */}
              {results.length > 0 && (
                <div className="space-y-6">
                  {/* Approved Results */}
                  {results.some(r => r.approved) && (
                    <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-8 shadow-2xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Resultados Aprovados</h3>
                            <p className="text-emerald-300 text-sm">Itens validados com sucesso</p>
                          </div>
                        </div>
                        <div className="bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl text-lg font-bold border border-emerald-500/30">
                          {results.filter(r => r.approved).length}
                        </div>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {results.filter(r => r.approved).map((result, index) => (
                          <div key={index} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 hover:bg-emerald-500/15 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-mono text-sm font-medium">{result.input}</p>
                                <p className="text-emerald-300 text-xs mt-1">{result.message}</p>
                              </div>
                              <div className="text-emerald-400 text-xs font-medium bg-emerald-500/20 px-3 py-1 rounded-lg">
                                APROVADO
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejected Results */}
                  {results.some(r => !r.approved) && (
                    <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-red-500/20 p-8 shadow-2xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <XCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Resultados Reprovados</h3>
                            <p className="text-red-300 text-sm">Itens que não passaram na validação</p>
                          </div>
                        </div>
                        <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-xl text-lg font-bold border border-red-500/30">
                          {results.filter(r => !r.approved).length}
                        </div>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {results.filter(r => !r.approved).map((result, index) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 hover:bg-red-500/15 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <XCircle className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-mono text-sm font-medium">{result.input}</p>
                                <p className="text-red-300 text-xs mt-1">{result.message}</p>
                              </div>
                              <div className="text-red-400 text-xs font-medium bg-red-500/20 px-3 py-1 rounded-lg">
                                REPROVADO
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Processing Stats */}
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Estatísticas</h3>
                    <p className="text-purple-300 text-xs">Sessão atual</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:bg-emerald-500/15 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-emerald-300 font-semibold">Aprovados</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {results.length > 0 ? results.filter(r => r.approved).length : session?.approved_count || 0}
                      </div>
                    </div>
                    <div className="w-full bg-emerald-900/30 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${session?.tested_count ? (session.approved_count / session.tested_count) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 hover:bg-red-500/15 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-red-300 font-semibold">Reprovados</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {results.length > 0 ? results.filter(r => !r.approved).length : session?.rejected_count || 0}
                      </div>
                    </div>
                    <div className="w-full bg-red-900/30 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${session?.tested_count ? (session.rejected_count / session.tested_count) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 hover:bg-blue-500/15 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-blue-300 font-semibold">Total Testados</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {results.length > 0 ? results.length : session?.tested_count || 0}
                      </div>
                    </div>
                    <div className="text-xs text-blue-300 opacity-70">
                      Itens processados nesta sessão
                    </div>
                  </div>
                  
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 hover:bg-purple-500/15 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="text-purple-300 font-semibold">Na Fila</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {inputList.split('\n').filter(l => l.trim()).length}
                      </div>
                    </div>
                    <div className="text-xs text-purple-300 opacity-70">
                      Aguardando processamento
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Subscription Info */}
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Assinatura</h3>
                    <p className="text-purple-300 text-xs">Status da conta</p>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-white mb-3 font-mono">
                    {user?.subscription_days || 0}
                  </div>
                  <p className="text-purple-300 text-lg font-medium">dias restantes</p>
                  
                  <div className="mt-6 bg-gray-800/50 rounded-2xl p-4">
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((user?.subscription_days || 0) / 365 * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>0 dias</span>
                      <span>365 dias</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Status */}
                <div className={`p-4 rounded-2xl border ${
                  (user?.subscription_days || 0) > 30 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : (user?.subscription_days || 0) > 7
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {(user?.subscription_days || 0) > 30 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (user?.subscription_days || 0) > 7 ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      (user?.subscription_days || 0) > 30 
                        ? 'text-emerald-300' 
                        : (user?.subscription_days || 0) > 7
                        ? 'text-yellow-300'
                        : 'text-red-300'
                    }`}>
                      {(user?.subscription_days || 0) > 30 
                        ? 'Assinatura Ativa' 
                        : (user?.subscription_days || 0) > 7
                        ? 'Renovação Próxima'
                        : 'Assinatura Expirada'
                      }
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {(user?.subscription_days || 0) > 30 
                      ? 'Sua assinatura está em dia' 
                      : (user?.subscription_days || 0) > 7
                      ? 'Considere renovar sua assinatura'
                      : 'Renove para continuar usando'
                    }
                  </p>
                </div>
              </div>

              {/* System Performance */}
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Performance</h3>
                    <p className="text-cyan-300 text-xs">Sistema em tempo real</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      <span className="text-white text-sm font-medium">CPU</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{systemInfo.cpuUsage}%</div>
                      <div className="w-20 bg-gray-700 rounded-full h-1.5 mt-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            systemInfo.cpuUsage > 70 ? 'bg-red-500' : 
                            systemInfo.cpuUsage > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${systemInfo.cpuUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-cyan-400" />
                      <span className="text-white text-sm font-medium">RAM</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{systemInfo.memoryUsage}%</div>
                      <div className="w-20 bg-gray-700 rounded-full h-1.5 mt-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            systemInfo.memoryUsage > 80 ? 'bg-red-500' : 
                            systemInfo.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${systemInfo.memoryUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      <span className="text-white text-sm font-medium">Conexões</span>
                    </div>
                    <div className="text-white font-bold">{systemInfo.activeConnections}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}