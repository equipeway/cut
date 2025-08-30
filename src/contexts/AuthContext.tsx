import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  getUserByEmail, 
  addLoginAttempt, 
  getRecentFailedAttempts, 
  isIPBanned, 
  banIP
} from '../lib/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, ipAddress: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('terramail_current_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (!userData.is_banned) {
          setUser(userData);
        } else {
          localStorage.removeItem('terramail_current_user');
        }
      } catch (error) {
        localStorage.removeItem('terramail_current_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, ipAddress: string) => {
    try {
      console.log('Login attempt:', { email, ipAddress });

      // Check if IP is banned
      const ipBanned = await isIPBanned(ipAddress);
      if (ipBanned) {
        console.log('IP is banned');
        return { success: false, error: 'IP address is banned' };
      }

      // Check recent failed attempts
      const recentAttempts = await getRecentFailedAttempts(ipAddress, 1);
      if (recentAttempts.length >= 5) {
        await banIP(ipAddress, 'Too many failed login attempts', 24);
        return { success: false, error: 'Too many failed attempts. IP banned for 24 hours.' };
      }

      // Get user
      const userData = await getUserByEmail(email);
      console.log('User found:', userData ? 'Yes' : 'No');
      
      if (!userData) {
        await addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'Email ou senha incorretos' };
      }

      if (userData.is_banned) {
        return { success: false, error: 'Conta banida' };
      }

      // Check IP restrictions
      if (userData.allowed_ips.length > 0 && !userData.allowed_ips.includes(ipAddress)) {
        await addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'IP não autorizado' };
      }

      // Verify password (simple comparison for now)
      console.log('Password check:', { provided: password, stored: userData.password_hash });
      if (password !== userData.password_hash) {
        await addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'Email ou senha incorretos' };
      }

      // Success
      await addLoginAttempt({
        ip_address: ipAddress,
        user_email: email,
        success: true
      });

      localStorage.setItem('terramail_current_user', JSON.stringify(userData));
      setUser(userData);
      console.log('Login successful');

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  };

  const logout = () => {
    localStorage.removeItem('terramail_current_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}