import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIPAddress } from '../hooks/useIPAddress';
import { Lock, Mail, AlertCircle, Shield, ArrowLeft } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { ipAddress, loading: ipLoading } = useIPAddress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ipLoading) return;

    setLoading(true);
    setError('');

    const result = await login(email, password, ipAddress);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to Plans */}
        <div className="mb-6">
          <Link 
            to="/plans"
            className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Planos
          </Link>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">TerrraMail</h1>
            <p className="text-purple-300 text-sm mt-1">Secure Processing Platform</p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all backdrop-blur-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all backdrop-blur-sm"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || ipLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-purple-500/20 text-center">
            <div className="flex items-center justify-center gap-2 text-purple-300 text-xs mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              IP: {ipLoading ? 'Detecting...' : ipAddress}
            </div>
            <p className="text-gray-500 text-xs">
              Demo: admin@terramail.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}