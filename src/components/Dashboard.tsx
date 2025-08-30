import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Package,
  ExternalLink
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

  useEffect(() => {
    if (user) {
      loadSession();
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
          // Corrige para aprovar tanto "Aprovada" como outros possíveis retornos da API
          approved = result.status === 'approved' || result.status === 'Aprovada' || result.approved === true;
          message = result.message || result.retorno || result.status;
        } catch (apiError) {
          // Fallback to mock processing when API is unavailable
          console.warn('API unavailable, using mock processing:', apiError);
          
          // Simple mock logic: approve emails, reject others
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
        
        // More specific error handling
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

  return (
    <div className="min-h-screen bg-black">
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

      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">TerrraMail</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/plans"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
              >
                <Package className="w-4 h-4" />
                Ver Planos
                <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="text-right">
                <p className="text-white text-sm font-medium">{user?.email}</p>
                <p className="text-purple-300 text-xs">{user?.role}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </button>
              )}
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {showAdmin && isAdmin ? (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-400" />
                Painel Administrativo
              </h2>
              <button
                onClick={() => setShowAdmin(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Content */}
            <div className="p-6">
              <AdminUserManagement />
            </div>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Processing Area */}
            <div className="xl:col-span-3 space-y-6">
              {/* Input Section */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 shadow-xl">
                <div className="mb-6">
                  <label className="block text-white text-sm font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    Lista de Processamento
                  </label>
                  <textarea
                    value={inputList}
                    onChange={(e) => setInputList(e.target.value)}
                    placeholder="Digite os itens para processar (um por linha)..."
                    className="w-full h-40 bg-gray-800/50 border border-purple-500/30 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all backdrop-blur-sm font-mono text-sm"
                  />
                </div>
                
                {/* Progress Bar */}
                {(isProcessing || progress > 0) && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-300 text-sm font-medium">
                        {isProcessing ? 'Processing...' : 'Complete'}
                      </span>
                      <span className="text-white text-sm font-mono">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {currentItem && (
                      <p className="text-gray-400 text-xs mt-2 font-mono">
                        Current: {currentItem}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button
                    onClick={startProcessing}
                    disabled={isProcessing || !inputList.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-5 h-5" />
                    Iniciar
                  </button>
                  
                  <button
                    onClick={stopProcessing}
                    disabled={!isProcessing}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Square className="w-5 h-5" />
                    Parar
                  </button>
                </div>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-4">
                  {/* Approved */}
                  {results.some(r => r.approved) && (
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-white font-semibold">Aprovados</h3>
                        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg text-xs font-medium">
                          {results.filter(r => r.approved).length}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {results.filter(r => r.approved).map((result, index) => (
                          <div key={index} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center text-xs font-mono text-white">
                            ✅ Aprovada ➔ {result.input} ➔ {result.message || ""} ➔ @monetizei
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {results.some(r => !r.approved) && (
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <h3 className="text-white font-semibold">Reprovados</h3>
                        <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-lg text-xs font-medium">
                          {results.filter(r => !r.approved).length}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {results.filter(r => !r.approved).map((result, index) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center text-xs font-mono text-white">
                            ✖️ Reprovada ➔ {result.input} ➔ {result.message || ""} ➔ @monetizei
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-4">
              {/* Main Stats */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 shadow-xl">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Estatísticas
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <span className="text-emerald-300 text-sm font-medium">Aprovados</span>
                    <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold min-w-[3rem] text-center shadow-lg">
                      {results.length > 0 ? results.filter(r => r.approved).length : session?.approved_count || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <span className="text-red-300 text-sm font-medium">Reprovados</span>
                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold min-w-[3rem] text-center shadow-lg">
                      {results.length > 0 ? results.filter(r => !r.approved).length : session?.rejected_count || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <span className="text-blue-300 text-sm font-medium">Testados</span>
                    <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold min-w-[3rem] text-center shadow-lg">
                      {results.length > 0 ? results.length : session?.tested_count || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <span className="text-purple-300 text-sm font-medium">Carregados</span>
                    <div className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold min-w-[3rem] text-center shadow-lg">
                      {results.length > 0 ? inputList.split('\n').filter(l => l.trim()).length : session?.loaded_count || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 shadow-xl">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Assinatura
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {user?.subscription_days || 0}
                  </div>
                  <p className="text-purple-300 text-sm">dias restantes</p>
                  <div className="mt-4 w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((user?.subscription_days || 0) / 365 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 shadow-xl">
                <button
                  onClick={clearResults}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-xl transition-all text-sm border border-gray-700 hover:border-gray-600"
                >
                  Limpar Resultados
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
