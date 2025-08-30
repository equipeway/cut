import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  getUserByEmail, 
  updateUser, 
  addLoginAttempt, 
  getRecentFailedAttempts, 
  isIPBanned, 
  banIP 
} from '../lib/storage';

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
    // Check if user is logged in
    const savedUser = localStorage.getItem('terramail_current_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (!userData.is_banned) {
        setUser(userData);
      } else {
        localStorage.removeItem('terramail_current_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, ipAddress: string) => {
    try {
      // Check if IP is banned
      if (isIPBanned(ipAddress)) {
        return { success: false, error: 'IP address is banned' };
      }

      // Check recent failed attempts for this IP
      const recentAttempts = getRecentFailedAttempts(ipAddress, 1);
      if (recentAttempts.length >= 5) {
        // Auto-ban IP
        banIP(ipAddress, 'Too many failed login attempts', 24);
        return { success: false, error: 'Too many failed attempts. IP banned for 24 hours.' };
      }

      // Get user data
      const userData = getUserByEmail(email);
      if (!userData) {
        addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'Invalid credentials' };
      }

      if (userData.is_banned) {
        return { success: false, error: 'Account is banned' };
      }

      // Check IP restrictions
      if (userData.allowed_ips.length > 0 && !userData.allowed_ips.includes(ipAddress)) {
        addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'IP address not allowed' };
      }

      // Simple password check (in production, use proper bcrypt)
      if (password !== 'admin123') {
        addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: false
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // Log successful attempt
      addLoginAttempt({
        ip_address: ipAddress,
        user_email: email,
        success: true
      });

      // Save user session
      localStorage.setItem('terramail_current_user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
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